import express from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import { AuthController } from "./src/controllers/AuthController.js";
import { authMiddleware } from "./src/middlewares/auth.js";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors());

// Rotas de autenticação (públicas)
app.post("/auth/login", AuthController.login);
app.post("/auth/register", AuthController.register);

// Middleware de autenticação para rotas protegidas
app.use(authMiddleware);

// ✅ Listar todos os materiais
app.get("/materiais", async (req, res) => {
  try {
    const materiais = await prisma.material.findMany({
      include: { movimentacoes: true },
      orderBy: { id: "asc" },
    });
    res.json(materiais);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar materiais." });
  }
});

// ✅ Criar novo material
app.post("/materiais", async (req, res) => {
  try {
    const { nome, descricao, quantidade, localizacao, estoqueMinimo, categoria } = req.body;

    if (!nome || quantidade == null) {
      return res.status(400).json({ error: "Nome e quantidade são obrigatórios." });
    }

    const material = await prisma.material.create({
      data: {
        nome,
        descricao,
        quantidade: Number(quantidade),
        localizacao,
        estoqueMinimo: estoqueMinimo ? Number(estoqueMinimo) : 5,
        categoria,
      },
    });

    res.json(material);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar material." });
  }
});

// ✅ Atualizar material
app.put("/materiais/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, quantidade, localizacao, estoqueMinimo, categoria, ativo } = req.body;

    const material = await prisma.material.update({
      where: { id: Number(id) },
      data: {
        nome,
        descricao,
        quantidade: Number(quantidade),
        localizacao,
        estoqueMinimo: Number(estoqueMinimo),
        categoria,
        ativo,
      },
    });

    res.json(material);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar material." });
  }
});

// ✅ Histórico de movimentações de um material (rota compatível)
app.get("/movimentacoes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const movimentacoes = await prisma.movimentacao.findMany({
      where: { materialId: Number(id) },
      orderBy: { dataHora: "desc" },
      include: { material: true },
    });
    res.json(movimentacoes);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar histórico do material." });
  }
});


// ✅ Desativar / Reativar material
app.patch("/materiais/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;

    const material = await prisma.material.update({
      where: { id: Number(id) },
      data: { ativo },
    });

    res.json(material);
  } catch (error) {
    res.status(500).json({ error: "Erro ao alterar status do material." });
  }
});

// ✅ Deletar material (desativar)
app.delete("/materiais/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const material = await prisma.material.update({
      where: { id: Number(id) },
      data: { ativo: false },
    });

    res.json(material);
  } catch (error) {
    res.status(500).json({ error: "Erro ao desativar material." });
  }
});

// ✅ Estatísticas gerais
app.get("/estatisticas", async (req, res) => {
  try {
    const totalMateriais = await prisma.material.count();
    const materiaisAtivos = await prisma.material.count({ where: { ativo: true } });

    const materiais = await prisma.material.findMany({ where: { ativo: true } });
    const materiaisBaixoEstoque = materiais.filter(m => m.quantidade <= m.estoqueMinimo).length;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const movimentacoesHoje = await prisma.movimentacao.count({
      where: {
        dataHora: {
          gte: hoje
        }
      }
    });

    const categorias = await prisma.material.groupBy({
      by: ['categoria'],
      _count: true,
      where: { ativo: true }
    });

    const categoriasFormatadas = categorias.map(c => ({
      nome: c.categoria || 'Sem categoria',
      total: c._count
    }));

    res.json({
      totalMateriais,
      materiaisAtivos,
      materiaisBaixoEstoque,
      movimentacoesHoje,
      categorias: categoriasFormatadas
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar estatísticas." });
  }
});

// ✅ Relatório de movimentações com filtros
app.get("/relatorios/movimentacoes", async (req, res) => {
  try {
    const { dataInicio, dataFim, tipo } = req.query;

    const where = {};

    if (tipo) {
      where.tipo = tipo;
    }

    if (dataInicio || dataFim) {
      where.dataHora = {};
      if (dataInicio) {
        where.dataHora.gte = new Date(dataInicio);
      }
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        where.dataHora.lte = fim;
      }
    }

    const movimentacoes = await prisma.movimentacao.findMany({
      where,
      orderBy: { dataHora: 'desc' },
      include: { material: true }
    });

    res.json(movimentacoes);
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar relatório." });
  }
});

// ✅ Registrar movimentação (entrada/saída)
app.post("/movimentacoes", async (req, res) => {
  try {
    const { materialId, tipo, quantidade, tecnico, observacao } = req.body;

    const material = await prisma.material.findUnique({ where: { id: Number(materialId) } });
    if (!material) return res.status(404).json({ error: "Material não encontrado." });

    const qtd = Number(quantidade);
    let novaQtd = tipo === "entrada" ? material.quantidade + qtd : material.quantidade - qtd;

    if (novaQtd < 0) return res.status(400).json({ error: "Quantidade insuficiente em estoque." });

    const movimentacao = await prisma.movimentacao.create({
      data: {
        materialId: material.id,
        tipo,
        quantidade: qtd,
        tecnico,
        observacao,
        quantidadeAnterior: material.quantidade,
        quantidadeAtual: novaQtd,
      },
    });

    await prisma.material.update({
      where: { id: material.id },
      data: { quantidade: novaQtd },
    });

    res.json(movimentacao);
  } catch (error) {
    res.status(500).json({ error: "Erro ao registrar movimentação." });
  }
});

// ✅ Listar todas as movimentações (com limite opcional)
app.get("/movimentacoes", async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const movimentacoes = await prisma.movimentacao.findMany({
      take: limit,
      orderBy: { dataHora: "desc" },
      include: { material: true }
    });
    res.json(movimentacoes);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar movimentações." });
  }
});

// ✅ Listar movimentações de um material (histórico)
app.get("/materiais/:id/movimentacoes", async (req, res) => {
  try {
    const { id } = req.params;
    const movimentacoes = await prisma.movimentacao.findMany({
      where: { materialId: Number(id) },
      orderBy: { dataHora: "desc" },
    });
    res.json(movimentacoes);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar movimentações." });
  }
});

// ✅ Relatório geral (opcional, usado no frontend)
app.get("/relatorio", async (req, res) => {
  try {
    const materiais = await prisma.material.findMany({
      include: { movimentacoes: true },
      orderBy: { nome: "asc" },
    });
    res.json(materiais);
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar relatório." });
  }
});

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));
