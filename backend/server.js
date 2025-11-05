import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// GET - listar materiais (com filtros)
app.get("/materiais", async (req, res) => {
  try {
    const { ativo, categoria, baixoEstoque } = req.query;
    
    const where = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (categoria) where.categoria = categoria;
    if (baixoEstoque === 'true') {
      where.quantidade = { lte: prisma.material.fields.estoqueMinimo };
    }

    const materiais = await prisma.material.findMany({
      where,
      orderBy: { atualizadoEm: 'desc' }
    });
    
    res.json(materiais);
  } catch (err) {
    console.error("Erro ao listar materiais:", err);
    res.status(500).json({ error: "Erro ao listar materiais" });
  }
});

// GET - buscar material por ID
app.get("/materiais/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const material = await prisma.material.findUnique({
      where: { id: Number(id) },
      include: {
        movimentacoes: {
          orderBy: { dataHora: 'desc' },
          take: 50
        }
      }
    });
    
    if (!material) {
      return res.status(404).json({ error: "Material não encontrado" });
    }
    
    res.json(material);
  } catch (err) {
    console.error("Erro ao buscar material:", err);
    res.status(500).json({ error: "Erro ao buscar material" });
  }
});

// POST - adicionar material
app.post("/materiais", async (req, res) => {
  const { nome, descricao, quantidade, localizacao, estoqueMinimo, categoria } = req.body;
  
  try {
    // Validações
    if (!nome?.trim()) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }
    if (!descricao?.trim()) {
      return res.status(400).json({ error: "Descrição é obrigatória" });
    }
    if (quantidade < 0) {
      return res.status(400).json({ error: "Quantidade não pode ser negativa" });
    }
    if (!localizacao?.trim()) {
      return res.status(400).json({ error: "Localização é obrigatória" });
    }

    const quantidadeInt = Number(quantidade) || 0;
    const estoqueMin = Number(estoqueMinimo) || 5;
    
    const novo = await prisma.material.create({
      data: { 
        nome: nome.trim(), 
        descricao: descricao.trim(), 
        quantidade: quantidadeInt, 
        localizacao: localizacao.trim(),
        estoqueMinimo: estoqueMin,
        categoria: categoria?.trim() || null
      },
    });
    
    // Registrar movimentação inicial se quantidade > 0
    if (quantidadeInt > 0) {
      await prisma.movimentacao.create({
        data: {
          materialId: novo.id,
          tipo: "entrada",
          quantidade: quantidadeInt,
          tecnico: "Sistema",
          observacao: "Cadastro inicial",
          quantidadeAnterior: 0,
          quantidadeAtual: quantidadeInt
        }
      });
    }
    
    res.status(201).json(novo);
  } catch (err) {
    console.error("Erro ao criar material:", err);
    res.status(500).json({ error: "Erro ao adicionar material" });
  }
});

// PUT - atualizar material
app.put("/materiais/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, quantidade, localizacao, estoqueMinimo, categoria, ativo } = req.body;
  
  try {
    const materialAtual = await prisma.material.findUnique({
      where: { id: Number(id) }
    });

    if (!materialAtual) {
      return res.status(404).json({ error: "Material não encontrado" });
    }

    const atualizado = await prisma.material.update({
      where: { id: Number(id) },
      data: { 
        nome, 
        descricao, 
        quantidade: Number(quantidade), 
        localizacao,
        estoqueMinimo: estoqueMinimo !== undefined ? Number(estoqueMinimo) : undefined,
        categoria: categoria?.trim() || null,
        ativo: ativo !== undefined ? ativo : undefined
      },
    });
    
    res.json(atualizado);
  } catch (err) {
    console.error("Erro ao atualizar material:", err);
    res.status(500).json({ error: "Erro ao atualizar material" });
  }
});

// DELETE - remover material (soft delete)
app.delete("/materiais/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const material = await prisma.material.findUnique({
      where: { id: Number(id) }
    });

    if (!material) {
      return res.status(404).json({ error: "Material não encontrado" });
    }

    // Soft delete - apenas marca como inativo
    await prisma.material.update({
      where: { id: Number(id) },
      data: { ativo: false }
    });
    
    res.json({ message: "Material desativado com sucesso" });
  } catch (err) {
    console.error("Erro ao remover material:", err);
    res.status(500).json({ error: "Erro ao remover material" });
  }
});

// POST - registrar movimentação
app.post("/movimentacoes", async (req, res) => {
  const { materialId, tipo, quantidade, tecnico, observacao } = req.body;
  
  try {
    // Validações
    if (!materialId) {
      return res.status(400).json({ error: "Material é obrigatório" });
    }
    if (!tipo || !["entrada", "saida"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo inválido" });
    }
    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ error: "Quantidade deve ser maior que zero" });
    }
    if (!tecnico?.trim()) {
      return res.status(400).json({ error: "Técnico é obrigatório" });
    }

    const material = await prisma.material.findUnique({
      where: { id: Number(materialId) }
    });

    if (!material) {
      return res.status(404).json({ error: "Material não encontrado" });
    }

    const qtd = Number(quantidade);
    const quantidadeAnterior = material.quantidade;
    const quantidadeAtual = tipo === "entrada" 
      ? quantidadeAnterior + qtd 
      : quantidadeAnterior - qtd;

    if (quantidadeAtual < 0) {
      return res.status(400).json({ error: "Quantidade insuficiente em estoque" });
    }

    // Cria movimentação e atualiza material em uma transação
    const [movimentacao, materialAtualizado] = await prisma.$transaction([
      prisma.movimentacao.create({
        data: {
          materialId: Number(materialId),
          tipo,
          quantidade: qtd,
          tecnico: tecnico.trim(),
          observacao: observacao?.trim() || null,
          quantidadeAnterior,
          quantidadeAtual
        }
      }),
      prisma.material.update({
        where: { id: Number(materialId) },
        data: { quantidade: quantidadeAtual }
      })
    ]);

    res.status(201).json({ movimentacao, material: materialAtualizado });
  } catch (err) {
    console.error("Erro ao registrar movimentação:", err);
    res.status(500).json({ error: "Erro ao registrar movimentação" });
  }
});

// GET - listar movimentações
app.get("/movimentacoes", async (req, res) => {
  try {
    const { materialId, tipo, limit = 100 } = req.query;
    
    const where = {};
    if (materialId) where.materialId = Number(materialId);
    if (tipo) where.tipo = tipo;

    const movimentacoes = await prisma.movimentacao.findMany({
      where,
      include: {
        material: {
          select: {
            nome: true,
            categoria: true
          }
        }
      },
      orderBy: { dataHora: 'desc' },
      take: Number(limit)
    });
    
    res.json(movimentacoes);
  } catch (err) {
    console.error("Erro ao listar movimentações:", err);
    res.status(500).json({ error: "Erro ao listar movimentações" });
  }
});

// GET - estatísticas
app.get("/estatisticas", async (req, res) => {
  try {
    const totalMateriais = await prisma.material.count({ where: { ativo: true } });
    const materiaisAtivos = await prisma.material.count({ 
      where: { ativo: true, quantidade: { gt: 0 } } 
    });
    const materiaisBaixoEstoque = await prisma.material.count({
      where: { 
        ativo: true,
        quantidade: { 
          lte: prisma.material.fields.estoqueMinimo 
        }
      }
    });
    
    const movimentacoesHoje = await prisma.movimentacao.count({
      where: {
        dataHora: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    const categorias = await prisma.material.groupBy({
      by: ['categoria'],
      where: { ativo: true },
      _count: true
    });

    res.json({
      totalMateriais,
      materiaisAtivos,
      materiaisBaixoEstoque,
      movimentacoesHoje,
      categorias: categorias.map(c => ({ 
        nome: c.categoria || 'Sem categoria', 
        total: c._count 
      }))
    });
  } catch (err) {
    console.error("Erro ao buscar estatísticas:", err);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

// GET - relatório de movimentações por período
app.get("/relatorios/movimentacoes", async (req, res) => {
  try {
    const { dataInicio, dataFim, tipo } = req.query;
    
    const where = {};
    if (dataInicio || dataFim) {
      where.dataHora = {};
      if (dataInicio) where.dataHora.gte = new Date(dataInicio);
      if (dataFim) where.dataHora.lte = new Date(dataFim);
    }
    if (tipo) where.tipo = tipo;

    const movimentacoes = await prisma.movimentacao.findMany({
      where,
      include: {
        material: true
      },
      orderBy: { dataHora: 'desc' }
    });

    const resumo = {
      totalEntradas: movimentacoes.filter(m => m.tipo === 'entrada').length,
      totalSaidas: movimentacoes.filter(m => m.tipo === 'saida').length,
      quantidadeEntradas: movimentacoes
        .filter(m => m.tipo === 'entrada')
        .reduce((sum, m) => sum + m.quantidade, 0),
      quantidadeSaidas: movimentacoes
        .filter(m => m.tipo === 'saida')
        .reduce((sum, m) => sum + m.quantidade, 0)
    };

    res.json({ movimentacoes, resumo });
  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

// Iniciar o servidor
app.listen(3001, () => console.log("🚀 API rodando em http://localhost:3001"));