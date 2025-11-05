import { useEffect, useState } from "react";

function App() {
  const [materiais, setMateriais] = useState([]);
  const [novoMaterial, setNovoMaterial] = useState({
    nome: "",
    descricao: "",
    quantidade: 0,
    localizacao: "",
  });

  useEffect(() => {
    // Carregar materiais da API
    fetch("http://localhost:3001/materiais")
      .then((res) => res.json())
      .then(setMateriais)
      .catch(console.error);
  }, []);

  const adicionarMaterial = async () => {
    const response = await fetch("http://localhost:3001/materiais", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(novoMaterial),
    });

    const data = await response.json();
    setMateriais([...materiais, data]); // Adiciona o material novo à lista
    setNovoMaterial({ nome: "", descricao: "", quantidade: 0, localizacao: "" }); // Limpa o formulário
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Controle de Materiais de TI</h1>

      <div>
        <input
          type="text"
          placeholder="Nome"
          value={novoMaterial.nome}
          onChange={(e) => setNovoMaterial({ ...novoMaterial, nome: e.target.value })}
        />
        <input
          type="text"
          placeholder="Descrição"
          value={novoMaterial.descricao}
          onChange={(e) => setNovoMaterial({ ...novoMaterial, descricao: e.target.value })}
        />
        <input
          type="number"
          placeholder="Quantidade"
          value={novoMaterial.quantidade}
          onChange={(e) => setNovoMaterial({ ...novoMaterial, quantidade: e.target.value })}
        />
        <input
          type="text"
          placeholder="Localização"
          value={novoMaterial.localizacao}
          onChange={(e) => setNovoMaterial({ ...novoMaterial, localizacao: e.target.value })}
        />
        <button onClick={adicionarMaterial}>Adicionar Material</button>
      </div>

      <ul>
        {materiais.map((material) => (
          <li key={material.id}>
            {material.nome} — {material.localizacao} ({material.quantidade})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
