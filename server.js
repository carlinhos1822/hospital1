const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const DB_FILE = path.join(__dirname, 'db.json');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Função para ler o banco de dados
function lerBancoDados() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(
            DB_FILE,
            JSON.stringify({ alunos: [] }, null, 2)
        );
    }

    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
}

// Função para salvar no banco de dados
function salvarBancosDados(dados) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(dados, null, 2)
    );
}

// CREATE - Cadastrar aluno
app.post('/api/alunos', (req, res) => {
    const { nome, email, curso } = req.body;

    if (!nome || !email || !curso) {
        return res.status(400).json({
            erro: 'Todos os campos são obrigatórios'
        });
    }

    const db = lerBancoDados();

    const nextId = db.alunos.length > 0
        ? Math.max(...db.alunos.map(a => a.id)) + 1
        : 1;

    const novoAluno = {
        id: nextId,
        nome,
        email,
        curso
    };

    db.alunos.push(novoAluno);
    salvarBancosDados(db);

    res.status(201).json(novoAluno);
});

// READ - Listar alunos
app.get('/api/alunos', (req, res) => {
    const db = lerBancoDados();

    res.json(db.alunos);
});

// UPDATE - Atualizar aluno
app.put('/api/alunos/:id', (req, res) => {
    const id = Number(req.params.id);
    const { nome, email, curso } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'ID inválido'
        });
    }

    if (!nome || !email || !curso) {
        return res.status(400).json({
            erro: 'Todos os campos são obrigatórios'
        });
    }

    const db = lerBancoDados();
    const index = db.alunos.findIndex(a => a.id === id);

    if (index === -1) {
        return res.status(404).json({
            erro: 'Aluno não encontrado'
        });
    }

    db.alunos[index] = {
        ...db.alunos[index],
        nome,
        email,
        curso
    };

    salvarBancosDados(db);

    res.json(db.alunos[index]);
});

// DELETE - Deletar aluno
app.delete('/api/alunos/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'ID inválido'
        });
    }

    const db = lerBancoDados();
    const index = db.alunos.findIndex(a => a.id === id);

    if (index === -1) {
        return res.status(404).json({
            erro: 'Aluno não encontrado'
        });
    }

    db.alunos.splice(index, 1);
    salvarBancosDados(db);

    res.status(204).send();
});

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        erro: 'Erro interno no servidor'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Banco de dados: ${DB_FILE}`);
});

