import { useEffect, useState } from "react";
import { Package, Search, Plus, Edit2, Trash2, AlertCircle, CheckCircle, X, Save, TrendingUp, TrendingDown } from "lucide-react";

function App() {
  const [materiais, setMateriais] = useState([]);
  const [filteredMateriais, setFilteredMateriais] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [materialSelecionado, setMaterialSelecionado] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [novoMaterial, setNovoMaterial] = useState({
    nome: "",
    descricao: "",
    quantidade: 0,
    localizacao: "",
  });

  const [movimentacao, setMovimentacao] = useState({
    quantidade: 0,
    tipo: "saida",
    tecnico: "",
    observacao: ""
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    carregarMateriais();
  }, []);

  useEffect(() => {
    const filtered = materiais.filter(material =>
      material.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.localizacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMateriais(filtered);
  }, [searchTerm, materiais]);

  const carregarMateriais = async () => {
    try {
      const response = await fetch("http://localhost:3001/materiais");
      const data = await response.json();
      setMateriais(data);
    } catch (error) {
      showAlert("Erro ao carregar materiais", "error");
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!novoMaterial.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }
    
    if (!novoMaterial.descricao.trim()) {
      newErrors.descricao = "Descrição é obrigatória";
    }
    
    if (novoMaterial.quantidade < 0) {
      newErrors.quantidade = "Quantidade não pode ser negativa";
    }
    
    if (!novoMaterial.localizacao.trim()) {
      newErrors.localizacao = "Localização é obrigatória";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateMovimentacao = () => {
    const newErrors = {};
    
    if (!movimentacao.quantidade || movimentacao.quantidade <= 0) {
      newErrors.quantidade = "Quantidade deve ser maior que zero";
    }
    
    if (movimentacao.tipo === "saida" && movimentacao.quantidade > materialSelecionado.quantidade) {
      newErrors.quantidade = "Quantidade maior que o estoque disponível";
    }
    
    if (!movimentacao.tecnico.trim()) {
      newErrors.tecnico = "Nome do técnico é obrigatório";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
  };

  const adicionarMaterial = async () => {
    console.log("Iniciando adição de material:", novoMaterial);
    
    // Validação dos campos obrigatórios
    if (!novoMaterial.nome.trim()) {
      showAlert("Nome é obrigatório", "error");
      return;
    }
    if (!novoMaterial.descricao.trim()) {
      showAlert("Descrição é obrigatória", "error");
      return;
    }
    if (novoMaterial.quantidade < 0) {
      showAlert("Quantidade não pode ser negativa", "error");
      return;
    }
    if (!novoMaterial.localizacao.trim()) {
      showAlert("Localização é obrigatória", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        nome: novoMaterial.nome.trim(),
        descricao: novoMaterial.descricao.trim(),
        quantidade: Number(novoMaterial.quantidade),
        localizacao: novoMaterial.localizacao.trim()
      };
      console.log("Enviando payload:", payload);
      
      const response = await fetch("http://localhost:3001/materiais", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
      });

      console.log("Status da resposta:", response.status);
      const data = await response.json();
      console.log("Dados recebidos:", data);

      if (!response.ok) {
        throw new Error(data.error || "Erro ao adicionar material");
      }

      // Atualiza o estado apenas se a requisição foi bem-sucedida
      setMateriais(materiais => [...materiais, data]);
      setNovoMaterial({ nome: "", descricao: "", quantidade: 0, localizacao: "" });
      setShowModal(false);
      setErrors({});
      showAlert("Material adicionado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao adicionar material:", error);
      showAlert(error.message || "Erro ao adicionar material", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const atualizarMaterial = async () => {
    if (!validateForm()) return;

    try {
      const payload = { ...novoMaterial, quantidade: Number(novoMaterial.quantidade) };
      
      const response = await fetch(`http://localhost:3001/materiais/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setMateriais(materiais.map(m => m.id === editingId ? data : m));
      setNovoMaterial({ nome: "", descricao: "", quantidade: 0, localizacao: "" });
      setShowModal(false);
      setEditingId(null);
      setErrors({});
      showAlert("Material atualizado com sucesso!", "success");
    } catch (error) {
      showAlert("Erro ao atualizar material", "error");
    }
  };

  const deletarMaterial = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este material?")) return;

    try {
      await fetch(`http://localhost:3001/materiais/${id}`, {
        method: "DELETE",
      });

      setMateriais(materiais.filter(m => m.id !== id));
      showAlert("Material excluído com sucesso!", "success");
    } catch (error) {
      showAlert("Erro ao excluir material", "error");
    }
  };

  const abrirModalEdicao = (material) => {
    setNovoMaterial(material);
    setEditingId(material.id);
    setShowModal(true);
  };

  const abrirModalNovo = () => {
    setNovoMaterial({ nome: "", descricao: "", quantidade: 0, localizacao: "" });
    setEditingId(null);
    setErrors({});
    setShowModal(true);
  };

  const abrirMovimentacao = (material) => {
    setMaterialSelecionado(material);
    setMovimentacao({ quantidade: 0, tipo: "saida", tecnico: "", observacao: "" });
    setErrors({});
    setShowMovimentacaoModal(true);
  };

  const processarMovimentacao = async () => {
    if (!validateMovimentacao()) return;

    try {
      const novaQuantidade = movimentacao.tipo === "entrada"
        ? materialSelecionado.quantidade + Number(movimentacao.quantidade)
        : materialSelecionado.quantidade - Number(movimentacao.quantidade);

      const response = await fetch(`http://localhost:3001/materiais/${materialSelecionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...materialSelecionado, quantidade: novaQuantidade }),
      });

      const data = await response.json();
      setMateriais(materiais.map(m => m.id === materialSelecionado.id ? data : m));
      setShowMovimentacaoModal(false);
      setMaterialSelecionado(null);
      setErrors({});
      showAlert(`${movimentacao.tipo === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!`, "success");
    } catch (error) {
      showAlert("Erro ao processar movimentação", "error");
    }
  };

  const getStatusColor = (quantidade) => {
    if (quantidade === 0) return "text-red-600 bg-red-50";
    if (quantidade <= 5) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Alert */}
      {alert.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
          alert.type === "success" ? "bg-green-500" : "bg-red-500"
        } text-white animate-fade-in`}>
          {alert.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {alert.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <Package className="text-blue-600" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Controle de Estoque TI</h1>
              <p className="text-slate-600 text-sm">Gerenciamento de materiais e equipamentos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar materiais..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <button
              onClick={abrirModalNovo}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} />
              Novo Material
            </button>
          </div>
        </div>

        {/* Lista de Materiais */}
        <div className="grid gap-4">
          {filteredMateriais.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Package className="mx-auto text-slate-300 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">Nenhum material encontrado</h3>
              <p className="text-slate-500">Adicione materiais para começar o controle de estoque</p>
            </div>
          ) : (
            filteredMateriais.map((material) => (
              <div key={material.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-slate-800">{material.nome}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(material.quantidade)}`}>
                        {material.quantidade} un.
                      </span>
                    </div>
                    <p className="text-slate-600 mb-3">{material.descricao}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Package size={16} />
                      <span>Localização: <strong>{material.localizacao}</strong></span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirMovimentacao(material)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Registrar movimentação"
                    >
                      <TrendingUp size={20} />
                    </button>
                    <button
                      onClick={() => abrirModalEdicao(material)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => deletarMaterial(material.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Material */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingId ? "Editar Material" : "Novo Material"}
              </h2>
              <button
                onClick={() => { setShowModal(false); setErrors({}); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
                e.preventDefault();
                console.log("Formulário submetido com valores:", novoMaterial);
                editingId ? atualizarMaterial() : adicionarMaterial();
              }} className="space-y-4">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome *</label>
                  <input
                    type="text"
                    value={novoMaterial.nome}
                    onChange={(e) => {
                      console.log("Nome alterado:", e.target.value);
                      setNovoMaterial({ ...novoMaterial, nome: e.target.value });
                    }}
                    className={`w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.nome ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Ex: Mouse USB"
                    required
                  />
                  {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Descrição *</label>
                  <textarea
                    value={novoMaterial.descricao}
                    onChange={(e) => setNovoMaterial({ ...novoMaterial, descricao: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.descricao ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Descreva o material"
                    rows="3"
                    required
                  />
                  {errors.descricao && <p className="text-red-500 text-sm mt-1">{errors.descricao}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Quantidade *</label>
                  <input
                    type="number"
                    value={novoMaterial.quantidade}
                    onChange={(e) => setNovoMaterial({ ...novoMaterial, quantidade: Number(e.target.value) })}
                    className={`w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.quantidade ? "border-red-500" : "border-slate-200"
                    }`}
                    min="0"
                    required
                  />
                  {errors.quantidade && <p className="text-red-500 text-sm mt-1">{errors.quantidade}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Localização *</label>
                  <input
                    type="text"
                    value={novoMaterial.localizacao}
                    onChange={(e) => setNovoMaterial({ ...novoMaterial, localizacao: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.localizacao ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Ex: Armário A - Prateleira 2"
                    required
                  />
                  {errors.localizacao && <p className="text-red-500 text-sm mt-1">{errors.localizacao}</p>}
                </div>
              </div>

              <div className="p-6 border-t flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setErrors({}); }}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {isSubmitting ? "Salvando..." : (editingId ? "Atualizar" : "Adicionar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Movimentação */}
      {showMovimentacaoModal && materialSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">Registrar Movimentação</h2>
              <button
                type="button"
                onClick={() => { setShowModal(false); setErrors({}); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
                e.preventDefault();
                console.log("Movimentação submetida:", movimentacao);
                processarMovimentacao();
              }} 
              className="space-y-4">
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-800 mb-1">{materialSelecionado.nome}</h3>
                  <p className="text-sm text-slate-600">Estoque atual: <strong>{materialSelecionado.quantidade} un.</strong></p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Movimentação *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMovimentacao({ ...movimentacao, tipo: "saida" })}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2 ${
                        movimentacao.tipo === "saida"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <TrendingDown size={20} />
                      Saída
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovimentacao({ ...movimentacao, tipo: "entrada" })}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2 ${
                        movimentacao.tipo === "entrada"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <TrendingUp size={20} />
                      Entrada
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Quantidade *</label>
                  <input
                    type="number"
                    value={movimentacao.quantidade}
                    onChange={(e) => setMovimentacao({ ...movimentacao, quantidade: Number(e.target.value) })}
                    className={`w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.quantidade ? "border-red-500" : "border-slate-200"
                    }`}
                    min="1"
                    placeholder="Quantidade"
                    required
                  />
                  {errors.quantidade && <p className="text-red-500 text-sm mt-1">{errors.quantidade}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Técnico Responsável *</label>
                  <input
                    type="text"
                    value={movimentacao.tecnico}
                    onChange={(e) => setMovimentacao({ ...movimentacao, tecnico: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.tecnico ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Nome do técnico"
                    required
                  />
                  {errors.tecnico && <p className="text-red-500 text-sm mt-1">{errors.tecnico}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Observação</label>
                  <textarea
                    value={movimentacao.observacao}
                    onChange={(e) => setMovimentacao({ ...movimentacao, observacao: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações adicionais (opcional)"
                    rows="2"
                  />
                </div>
              </div>

              <div className="p-6 border-t flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowMovimentacaoModal(false); setErrors({}); }}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-6 py-3 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    movimentacao.tipo === "saida"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  <Save size={20} />
                  Confirmar {movimentacao.tipo === "saida" ? "Saída" : "Entrada"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;