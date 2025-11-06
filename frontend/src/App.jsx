import React, { useEffect, useState } from "react";
import {
  Package, Search, Plus, Edit2, Trash2, AlertCircle, CheckCircle, X, Save,
  TrendingUp, TrendingDown, History, BarChart3, Filter, FileText, Download,
  AlertTriangle, Archive, Eye, Calendar, Users, Loader2, RefreshCw, MapPin, Box
} from "lucide-react";

const API_URL = "http://localhost:3001";

export default function App() {
  const [materiais, setMateriais] = useState([]);
  const [filteredMateriais, setFilteredMateriais] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("ativos");
  const [showModal, setShowModal] = useState(false);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [materialSelecionado, setMaterialSelecionado] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("estoque");
  const [loading, setLoading] = useState(false);

  const [novoMaterial, setNovoMaterial] = useState({
    nome: "",
    descricao: "",
    quantidade: 0,
    localizacao: "",
    estoqueMinimo: 5,
    categoria: ""
  });

  const [movimentacao, setMovimentacao] = useState({
    quantidade: 0,
    tipo: "saida",
    tecnico: "",
    observacao: ""
  });

  const [filtroRelatorio, setFiltroRelatorio] = useState({
    dataInicio: "",
    dataFim: "",
    tipo: ""
  });

  const [errors, setErrors] = useState({});

  const categorias = ["Periféricos", "Componentes", "Cabos", "Acessórios", "Ferramentas", "Consumíveis"];

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [searchTerm, materiais, filtroCategoria, filtroStatus]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      await Promise.all([
        carregarMateriais(),
        carregarMovimentacoes(),
        carregarEstatisticas()
      ]);
    } catch (error) {
      showAlert("Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  };

  const carregarMateriais = async () => {
    try {
      const response = await fetch(`${API_URL}/materiais`);
      if (!response.ok) throw new Error("Erro ao buscar materiais");
      const data = await response.json();
      setMateriais(data);
    } catch (error) {
      console.error("Erro ao carregar materiais:", error);
      throw error;
    }
  };

  const carregarMovimentacoes = async () => {
    try {
      const response = await fetch(`${API_URL}/movimentacoes?limit=50`);
      if (!response.ok) throw new Error("Erro ao buscar movimentações");
      const data = await response.json();
      setMovimentacoes(data);
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const response = await fetch(`${API_URL}/estatisticas`);
      if (!response.ok) throw new Error("Erro ao buscar estatísticas");
      const data = await response.json();
      setEstatisticas(data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const aplicarFiltros = () => {
    let filtered = materiais.filter(m => {
      const matchSearch =
        m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.localizacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.descricao?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategoria = !filtroCategoria || m.categoria === filtroCategoria;

      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativos" && m.ativo) ||
        (filtroStatus === "baixoEstoque" && m.ativo && m.quantidade <= m.estoqueMinimo) ||
        (filtroStatus === "zerados" && m.ativo && m.quantidade === 0) ||
        (filtroStatus === "inativos" && !m.ativo);

      return matchSearch && matchCategoria && matchStatus;
    });

    setFilteredMateriais(filtered);
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3500);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!novoMaterial.nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (!novoMaterial.descricao.trim()) newErrors.descricao = "Descrição é obrigatória";
    if (novoMaterial.quantidade < 0) newErrors.quantidade = "Quantidade não pode ser negativa";
    if (!novoMaterial.localizacao.trim()) newErrors.localizacao = "Localização é obrigatória";
    if (novoMaterial.estoqueMinimo < 0) newErrors.estoqueMinimo = "Estoque mínimo inválido";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateMovimentacao = () => {
    const newErrors = {};
    if (!movimentacao.quantidade || movimentacao.quantidade <= 0) {
      newErrors.quantidade = "Quantidade deve ser maior que zero";
    }
    if (movimentacao.tipo === "saida" && materialSelecionado && movimentacao.quantidade > materialSelecionado.quantidade) {
      newErrors.quantidade = "Quantidade maior que o estoque disponível";
    }
    if (!movimentacao.tecnico.trim()) {
      newErrors.tecnico = "Nome do técnico é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const adicionarMaterial = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        nome: novoMaterial.nome.trim(),
        descricao: novoMaterial.descricao.trim(),
        quantidade: Number(novoMaterial.quantidade),
        localizacao: novoMaterial.localizacao.trim(),
        estoqueMinimo: Number(novoMaterial.estoqueMinimo),
        categoria: novoMaterial.categoria || null
      };

      const response = await fetch(`${API_URL}/materiais`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro no servidor');

      await carregarDados();
      setNovoMaterial({ nome: "", descricao: "", quantidade: 0, localizacao: "", estoqueMinimo: 5, categoria: "" });
      setShowModal(false);
      setErrors({});
      showAlert("Material adicionado com sucesso!", "success");
    } catch (error) {
      showAlert(error.message || "Erro ao adicionar material", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const atualizarMaterial = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        ...novoMaterial,
        quantidade: Number(novoMaterial.quantidade),
        estoqueMinimo: Number(novoMaterial.estoqueMinimo)
      };

      const response = await fetch(`${API_URL}/materiais/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro no servidor');

      await carregarDados();
      setNovoMaterial({ nome: "", descricao: "", quantidade: 0, localizacao: "", estoqueMinimo: 5, categoria: "" });
      setShowModal(false);
      setEditingId(null);
      setErrors({});
      showAlert("Material atualizado com sucesso!", "success");
    } catch (error) {
      showAlert(error.message || "Erro ao atualizar material", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletarMaterial = async (id) => {
    if (!window.confirm("Tem certeza que deseja desativar este material?")) return;

    try {
      const response = await fetch(`${API_URL}/materiais/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao desativar material");

      await carregarDados();
      showAlert("Material desativado com sucesso!", "success");
    } catch (error) {
      showAlert(error.message || "Erro ao desativar material", "error");
    }
  };

  const processarMovimentacao = async () => {
    if (!validateMovimentacao()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/movimentacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: materialSelecionado.id,
          tipo: movimentacao.tipo,
          quantidade: Number(movimentacao.quantidade),
          tecnico: movimentacao.tecnico.trim(),
          observacao: movimentacao.observacao?.trim() || null
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro no servidor');

      await carregarDados();
      setShowMovimentacaoModal(false);
      setMaterialSelecionado(null);
      setMovimentacao({ quantidade: 0, tipo: "saida", tecnico: "", observacao: "" });
      setErrors({});
      showAlert(`${movimentacao.tipo === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!`, "success");
    } catch (error) {
      showAlert(error.message || "Erro ao processar movimentação", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const abrirHistorico = async (material) => {
    try {
      const response = await fetch(`${API_URL}/materiais/${material.id}/movimentacoes`);
      if (!response.ok) throw new Error("Erro ao carregar histórico");
      const data = await response.json();
      setMaterialSelecionado({ ...material, movimentacoes: data });
      setShowHistoricoModal(true);
    } catch (error) {
      showAlert("Erro ao carregar histórico", "error");
    }
  };

  const getStatusColor = (material) => {
    if (!material.ativo) return "text-slate-400 bg-slate-700/30";
    if (material.quantidade === 0) return "text-red-400 bg-red-500/20";
    if (material.quantidade <= material.estoqueMinimo) return "text-amber-400 bg-amber-500/20";
    return "text-emerald-400 bg-emerald-500/20";
  };

  const getStatusBadge = (material) => {
    if (!material.ativo) return { text: "Inativo", icon: Archive };
    if (material.quantidade === 0) return { text: "Zerado", icon: AlertCircle };
    if (material.quantidade <= material.estoqueMinimo) return { text: "Baixo", icon: AlertTriangle };
    return { text: "Normal", icon: CheckCircle };
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleString('pt-BR');
    } catch (e) {
      return date;
    }
  };

  const exportarCSV = () => {
    const headers = ["ID", "Nome", "Descrição", "Quantidade", "Estoque Mínimo", "Categoria", "Localização", "Status", "Atualizado Em"];
    const rows = materiais.map(m => [
      m.id,
      m.nome,
      m.descricao,
      m.quantidade,
      m.estoqueMinimo,
      m.categoria || "-",
      m.localizacao,
      m.ativo ? "Ativo" : "Inativo",
      formatDate(m.atualizadoEm)
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `materiais_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showAlert("Exportação realizada com sucesso!", "success");
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {alert.show && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md border-2 animate-[slideIn_0.3s_ease-out] ${
          alert.type === "success"
            ? "bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400/50 shadow-emerald-500/50"
            : "bg-gradient-to-r from-red-500 to-red-600 border-red-400/50 shadow-red-500/50"
        } text-white`}>
          {alert.type === "success" ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
          <span className="font-semibold text-base">{alert.message}</span>
        </div>
      )}

      <div className="w-screen bg-gradient-to-r from-slate-900/95 to-slate-800/95 shadow-2xl border-b-2 border-slate-700/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between mb-5 w-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 rounded-xl shadow-xl shadow-blue-500/40 ring-2 ring-blue-400/30">
                <Package className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
                  Controle de Estoque TI
                </h1>
                <p className="text-slate-400 text-sm mt-1 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Sistema profissional de gerenciamento
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRelatorioModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 border border-violet-400/30"
              >
                <FileText size={18} />
                <span className="hidden sm:inline">Relatórios</span>
              </button>

              <button
                onClick={exportarCSV}
                className="flex items-center gap-2 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:scale-105 border border-slate-600/50"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Exportar</span>
              </button>

              <button
                onClick={carregarDados}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-blue-500/30 hover:scale-105 border border-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 border-b-2 border-slate-700/50">
            {[
              { id: "estoque", label: "Estoque", icon: Package },
              { id: "movimentacoes", label: "Movimentações", icon: History },
              { id: "dashboard", label: "Dashboard", icon: BarChart3 }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-bold transition-all duration-200 border-b-4 relative rounded-t-lg ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-400 bg-slate-800/60"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </div>
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent rounded-t-lg -z-10"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-screen px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-400" size={48} />
              <span className="text-slate-300 text-xl font-semibold">Carregando dados...</span>
            </div>
          </div>
        )}

        {activeTab === "dashboard" && estatisticas && !loading && (
          <div className="space-y-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-5 w-full">
              {[
                { label: "Total de Materiais", value: estatisticas.totalMateriais, icon: Package, color: "blue", gradient: "from-blue-500 to-blue-600", ring: "ring-blue-400/30" },
                { label: "Materiais Ativos", value: estatisticas.materiaisAtivos, icon: CheckCircle, color: "emerald", gradient: "from-emerald-500 to-emerald-600", ring: "ring-emerald-400/30" },
                { label: "Baixo Estoque", value: estatisticas.materiaisBaixoEstoque, icon: AlertTriangle, color: "amber", gradient: "from-amber-500 to-amber-600", ring: "ring-amber-400/30" },
                { label: "Movimentações Hoje", value: estatisticas.movimentacoesHoje, icon: TrendingUp, color: "violet", gradient: "from-violet-500 to-violet-600", ring: "ring-violet-400/30" }
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-xl p-5 border-2 border-slate-700/50 hover:border-slate-600/70 transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">{stat.label}</p>
                        <p className={`text-4xl font-black text-${stat.color}-400`}>{stat.value}</p>
                      </div>
                      <div className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl ring-2 ${stat.ring} shadow-lg`}>
                        <Icon className="text-white" size={24} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-xl p-6 border-2 border-slate-700/50">
              <h3 className="text-xl font-black text-slate-200 mb-4 flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg ring-2 ring-blue-400/30">
                  <Filter className="text-blue-400" size={22} />
                </div>
                Materiais por Categoria
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3 w-full">
                {estatisticas.categorias.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg border-2 border-slate-600/40 hover:border-blue-500/60 transition-all duration-300 hover:scale-105 shadow-lg">
                    <span className="font-bold text-slate-200 text-base">{cat.nome}</span>
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-sm font-black ring-2 ring-blue-400/30">
                      {cat.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "movimentacoes" && !loading && (
          <div className="w-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-xl border-2 border-slate-700/50">
            <div className="w-full p-6 border-b-2 border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
              <h2 className="text-2xl font-black text-slate-200 flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg ring-2 ring-blue-400/30">
                  <History className="text-blue-400" size={24} />
                </div>
                Histórico de Movimentações
              </h2>
            </div>
            <div className="p-6">
              {movimentacoes.length === 0 ? (
                <div className="text-center py-16">
                  <History className="mx-auto text-slate-600 mb-4" size={64} />
                  <p className="text-slate-400 text-xl font-bold">Nenhuma movimentação registrada</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {movimentacoes.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-700/40 to-slate-800/40 rounded-xl hover:from-slate-700/60 hover:to-slate-800/60 transition-all duration-300 border-2 border-slate-600/40 hover:border-slate-500/70 shadow-lg">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-3 rounded-xl ring-2 shadow-lg ${
                          mov.tipo === "entrada"
                            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 ring-emerald-400/40"
                            : "bg-gradient-to-br from-red-500 to-red-600 ring-red-400/40"
                        }`}>
                          {mov.tipo === "entrada" ? (
                            <TrendingUp className="text-white" size={20} />
                          ) : (
                            <TrendingDown className="text-white" size={20} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-slate-100 text-lg">{mov.material.nome}</p>
                            {mov.material.categoria && (
                              <span className="text-xs text-slate-300 px-2 py-1 bg-slate-600/50 rounded-full font-semibold">
                                {mov.material.categoria}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              {mov.tecnico}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {formatDate(mov.dataHora)}
                            </span>
                          </div>
                          {mov.observacao && (
                            <p className="text-xs text-slate-400 mt-2 italic bg-slate-900/60 p-2 rounded-md">{mov.observacao}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-2xl font-black ${
                          mov.tipo === "entrada" ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {mov.tipo === "entrada" ? "+" : "-"}{mov.quantidade}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 font-bold">
                          {mov.quantidadeAnterior} → {mov.quantidadeAtual}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "estoque" && !loading && (
          <>
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-xl p-5 mb-5 border-2 border-slate-700/50">
              <div className="flex gap-3 flex-wrap items-center mb-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar por nome, localização ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-700/60 border-2 border-slate-600/50 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none text-slate-200 placeholder-slate-400 transition-all font-medium"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setNovoMaterial({ nome: "", descricao: "", quantidade: 0, localizacao: "", estoqueMinimo: 5, categoria: "" });
                    setEditingId(null);
                    setErrors({});
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-3 rounded-lg font-bold transition-all shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105 border border-blue-400/30"
                >
                  <Plus size={20} />
                  Novo Material
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 transition-all text-sm"
                >
                  <option value="">Todas categorias</option>
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 transition-all text-sm"
                >
                  <option value="ativos">Ativos</option>
                  <option value="baixoEstoque">Baixo Estoque</option>
                  <option value="zerados">Zerados</option>
                  <option value="inativos">Inativos</option>
                  <option value="todos">Todos</option>
                </select>

                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFiltroCategoria("");
                    setFiltroStatus("ativos");
                  }}
                  className="px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all border border-slate-600/30 text-sm"
                >
                  Limpar filtros
                </button>
              </div>
            </div>

            <div className="grid gap-3 w-full">
              {filteredMateriais.length === 0 ? (
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-xl p-12 text-center border-2 border-slate-700/50">
                  <Package className="mx-auto text-slate-500 mb-4" size={64} />
                  <h3 className="text-2xl font-bold text-slate-200 mb-2">Nenhum material encontrado</h3>
                  <p className="text-slate-400">Ajuste os filtros ou adicione novos materiais</p>
                </div>
              ) : (
                filteredMateriais.map((material) => {
                  const status = getStatusBadge(material);
                  const StatusIcon = status.icon;

                  return (
                    <div key={material.id} className={`bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-xl p-5 hover:shadow-2xl transition-all border-2 ${
                      !material.ativo ? "border-slate-600" :
                      material.quantidade === 0 ? "border-red-500" :
                      material.quantidade <= material.estoqueMinimo ? "border-amber-500" :
                      "border-emerald-500"
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-xl font-black text-slate-100">{material.nome}</h3>

                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(material)}`}>
                              <StatusIcon size={14} />
                              <span className="font-semibold">{material.quantidade} un.</span>
                            </span>

                            {material.categoria && (
                              <span className="px-2 py-1 bg-slate-700/50 text-slate-200 rounded-full text-xs font-medium flex items-center gap-1">
                                <Box size={14} />
                                {material.categoria}
                              </span>
                            )}
                          </div>

                          <p className="text-slate-300 mb-2 text-sm">{material.descricao}</p>

                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {material.localizacao}
                            </span>
                            <span>Estoque mínimo: <strong className="text-slate-200">{material.estoqueMinimo}</strong></span>
                            <span>Última atualização: <strong className="text-slate-200">{formatDate(material.atualizadoEm)}</strong></span>
                          </div>
                        </div>

                        <div className="flex gap-2 items-start">
                          <button
                            onClick={() => abrirHistorico(material)}
                            className="p-2 text-violet-400 hover:bg-violet-800/30 rounded-lg transition-colors"
                            title="Ver histórico"
                          >
                            <History size={18} />
                          </button>
                          {material.ativo && (
                            <button
                              onClick={() => {
                                setMaterialSelecionado(material);
                                setMovimentacao({ quantidade: 0, tipo: "saida", tecnico: "", observacao: "" });
                                setErrors({});
                                setShowMovimentacaoModal(true);
                              }}
                              className="p-2 text-emerald-400 hover:bg-emerald-800/20 rounded-lg transition-colors"
                              title="Registrar movimentação"
                            >
                              <TrendingUp size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setNovoMaterial({
                                nome: material.nome,
                                descricao: material.descricao,
                                quantidade: material.quantidade,
                                localizacao: material.localizacao,
                                estoqueMinimo: material.estoqueMinimo,
                                categoria: material.categoria || "",
                                ativo: material.ativo
                              });
                              setEditingId(material.id);
                              setShowModal(true);
                            }}
                            className="p-2 text-slate-200 hover:bg-slate-800/40 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => deletarMaterial(material.id)}
                            className="p-2 text-red-500 hover:bg-red-800/20 rounded-lg transition-colors"
                            title="Desativar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl p-6 border-2 border-slate-700/60 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100">{editingId ? 'Editar Material' : 'Novo Material'}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null); setErrors({}); }} className="p-2 rounded-full hover:bg-slate-800/60">
                <X className="text-slate-200" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nome</label>
                <input value={novoMaterial.nome} onChange={(e) => setNovoMaterial(prev => ({...prev, nome: e.target.value}))} className={`w-full px-3 py-2 border rounded-lg outline-none ${errors.nome ? 'border-red-500' : 'border-slate-700 bg-slate-800/50'} text-slate-100`} />
                {errors.nome && <p className="text-xs text-red-400 mt-1">{errors.nome}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Categoria</label>
                <select value={novoMaterial.categoria} onChange={(e) => setNovoMaterial(prev => ({...prev, categoria: e.target.value}))} className="w-full px-3 py-2 border rounded-lg outline-none border-slate-700 bg-slate-800/50 text-slate-100">
                  <option value="">Selecione</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
                <textarea value={novoMaterial.descricao} onChange={(e) => setNovoMaterial(prev => ({...prev, descricao: e.target.value}))} className={`w-full px-3 py-2 border rounded-lg outline-none ${errors.descricao ? 'border-red-500' : 'border-slate-700 bg-slate-800/50'} text-slate-100`} rows={3} />
                {errors.descricao && <p className="text-xs text-red-400 mt-1">{errors.descricao}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Quantidade</label>
                <input type="number" value={novoMaterial.quantidade} onChange={(e) => setNovoMaterial(prev => ({...prev, quantidade: Number(e.target.value)}))} className={`w-full px-3 py-2 border rounded-lg outline-none ${errors.quantidade ? 'border-red-500' : 'border-slate-700 bg-slate-800/50'} text-slate-100`} />
                {errors.quantidade && <p className="text-xs text-red-400 mt-1">{errors.quantidade}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Estoque Mínimo</label>
                <input type="number" value={novoMaterial.estoqueMinimo} onChange={(e) => setNovoMaterial(prev => ({...prev, estoqueMinimo: Number(e.target.value)}))} className={`w-full px-3 py-2 border rounded-lg outline-none ${errors.estoqueMinimo ? 'border-red-500' : 'border-slate-700 bg-slate-800/50'} text-slate-100`} />
                {errors.estoqueMinimo && <p className="text-xs text-red-400 mt-1">{errors.estoqueMinimo}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Localização</label>
                <input value={novoMaterial.localizacao} onChange={(e) => setNovoMaterial(prev => ({...prev, localizacao: e.target.value}))} className={`w-full px-3 py-2 border rounded-lg outline-none ${errors.localizacao ? 'border-red-500' : 'border-slate-700 bg-slate-800/50'} text-slate-100`} />
                {errors.localizacao && <p className="text-xs text-red-400 mt-1">{errors.localizacao}</p>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setErrors({}); }} className="px-4 py-2 rounded-lg hover:bg-slate-800/60 text-slate-200">Cancelar</button>
              {editingId ? (
                <button onClick={atualizarMaterial} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvar alterações
                </button>
              ) : (
                <button onClick={adicionarMaterial} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Adicionar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showMovimentacaoModal && materialSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 border-2 border-slate-700/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100">Registrar Movimentação - {materialSelecionado.nome}</h3>
              <button onClick={() => { setShowMovimentacaoModal(false); setMaterialSelecionado(null); setErrors({}); }} className="p-2 rounded-full hover:bg-slate-800/60">
                <X className="text-slate-200" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input type="radio" name="tipo" checked={movimentacao.tipo === 'saida'} onChange={() => setMovimentacao(prev => ({...prev, tipo: 'saida'}))} className="cursor-pointer" />
                  Saída
                </label>
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input type="radio" name="tipo" checked={movimentacao.tipo === 'entrada'} onChange={() => setMovimentacao(prev => ({...prev, tipo: 'entrada'}))} className="cursor-pointer" />
                  Entrada
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Quantidade</label>
                <input type="number" value={movimentacao.quantidade} onChange={(e) => setMovimentacao(prev => ({...prev, quantidade: Number(e.target.value)}))} className={`w-full px-3 py-2 border rounded-lg outline-none ${errors.quantidade ? 'border-red-500' : 'border-slate-700 bg-slate-800/50'} text-slate-100`} />
                {errors.quantidade && <p className="text-xs text-red-400 mt-1">{errors.quantidade}</p>}
                <p className="text-xs text-slate-400 mt-1">Estoque atual: {materialSelecionado.quantidade} un.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Técnico</label>
                <input value={movimentacao.tecnico} onChange={(e) => setMovimentacao(prev => ({...prev, tecnico: e.target.value}))} className={`w-full px-3 py-2 border rounded-lg outline-none ${errors.tecnico ? 'border-red-500' : 'border-slate-700 bg-slate-800/50'} text-slate-100`} />
                {errors.tecnico && <p className="text-xs text-red-400 mt-1">{errors.tecnico}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Observação (opcional)</label>
                <textarea value={movimentacao.observacao} onChange={(e) => setMovimentacao(prev => ({...prev, observacao: e.target.value}))} className="w-full px-3 py-2 border rounded-lg outline-none border-slate-700 bg-slate-800/50 text-slate-100" rows={3} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => { setShowMovimentacaoModal(false); setMaterialSelecionado(null); setErrors({}); }} className="px-4 py-2 rounded-lg hover:bg-slate-800/60 text-slate-200">Cancelar</button>
              <button onClick={processarMovimentacao} disabled={isSubmitting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoricoModal && materialSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl p-6 border-2 border-slate-700/60 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100">Histórico - {materialSelecionado.nome}</h3>
              <button onClick={() => { setShowHistoricoModal(false); setMaterialSelecionado(null); }} className="p-2 rounded-full hover:bg-slate-800/60">
                <X className="text-slate-200" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
              {materialSelecionado.movimentacoes && materialSelecionado.movimentacoes.length > 0 ? (
                materialSelecionado.movimentacoes.map(mov => (
                  <div key={mov.id} className="p-3 bg-slate-800/50 rounded-lg flex items-start gap-3 border border-slate-700/50">
                    <div className={`p-2 rounded-md ${mov.tipo === 'entrada' ? 'bg-emerald-600/20' : 'bg-red-600/20'}`}>
                      {mov.tipo === 'entrada' ? <TrendingUp className="text-emerald-400" size={18} /> : <TrendingDown className="text-red-400" size={18} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-300">{mov.tecnico} • {formatDate(mov.dataHora)}</div>
                        <div className={`font-semibold ${mov.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>{mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade} un</div>
                      </div>
                      {mov.observacao && <div className="text-sm text-slate-400 mt-1">{mov.observacao}</div>}
                      <div className="text-xs text-slate-500 mt-1">{mov.quantidadeAnterior} → {mov.quantidadeAtual}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">Nenhuma movimentação encontrada para este material.</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700/50">
              <button onClick={() => {
                const rows = (materialSelecionado.movimentacoes || []).map(m => [
                  m.id, m.tipo, m.quantidade, m.tecnico, m.observacao || "", formatDate(m.dataHora)
                ]);
                let csv = "ID,Tipo,Quantidade,Técnico,Observação,DataHora\n";
                rows.forEach(r => csv += r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",") + "\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const l = document.createElement("a");
                l.href = URL.createObjectURL(blob);
                l.download = `historico_${materialSelecionado.id}.csv`;
                l.click();
              }} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Exportar CSV</button>
              <button onClick={() => { setShowHistoricoModal(false); setMaterialSelecionado(null); }} className="px-4 py-2 rounded-lg hover:bg-slate-800/60 text-slate-200">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showRelatorioModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 border-2 border-slate-700/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100">Gerar Relatório de Movimentações</h3>
              <button onClick={() => setShowRelatorioModal(false)} className="p-2 rounded-full hover:bg-slate-800/60">
                <X className="text-slate-200" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Data início</label>
                <input type="date" value={filtroRelatorio.dataInicio} onChange={(e) => setFiltroRelatorio(prev => ({...prev, dataInicio: e.target.value}))} className="w-full px-3 py-2 border rounded-lg outline-none border-slate-700 bg-slate-800/50 text-slate-100" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Data fim</label>
                <input type="date" value={filtroRelatorio.dataFim} onChange={(e) => setFiltroRelatorio(prev => ({...prev, dataFim: e.target.value}))} className="w-full px-3 py-2 border rounded-lg outline-none border-slate-700 bg-slate-800/50 text-slate-100" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                <select value={filtroRelatorio.tipo} onChange={(e) => setFiltroRelatorio(prev => ({...prev, tipo: e.target.value}))} className="w-full px-3 py-2 border rounded-lg outline-none border-slate-700 bg-slate-800/50 text-slate-100">
                  <option value="">Todos</option>
                  <option value="entrada">Entradas</option>
                  <option value="saida">Saídas</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowRelatorioModal(false)} className="px-4 py-2 rounded-lg hover:bg-slate-800/60 text-slate-200">Cancelar</button>
              <button onClick={async () => {
                try {
                  setIsSubmitting(true);
                  const params = new URLSearchParams();
                  if (filtroRelatorio.dataInicio) params.append('dataInicio', filtroRelatorio.dataInicio);
                  if (filtroRelatorio.dataFim) params.append('dataFim', filtroRelatorio.dataFim);
                  if (filtroRelatorio.tipo) params.append('tipo', filtroRelatorio.tipo);

                  const res = await fetch(`${API_URL}/relatorios/movimentacoes?${params}`);
                  if (!res.ok) throw new Error("Erro ao gerar relatório");
                  const data = await res.json();

                  let csv = "ID,Material,Tipo,Quantidade,Técnico,Observação,DataHora\n";
                  (data || []).forEach(r => {
                    csv += [
                      r.id,
                      r.material?.nome || "",
                      r.tipo,
                      r.quantidade,
                      r.tecnico || "",
                      (r.observacao || "").replace(/"/g,'""'),
                      formatDate(r.dataHora)
                    ].map(c => `"${String(c).replace(/"/g,'""')}"`).join(",") + "\n";
                  });
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const l = document.createElement("a");
                  l.href = URL.createObjectURL(blob);
                  l.download = `relatorio_movimentacoes_${new Date().toISOString().split('T')[0]}.csv`;
                  l.click();
                  setShowRelatorioModal(false);
                  showAlert("Relatório gerado com sucesso!", "success");
                } catch (err) {
                  showAlert("Erro ao gerar relatório", "error");
                } finally {
                  setIsSubmitting(false);
                }
              }} disabled={isSubmitting} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />} Gerar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
