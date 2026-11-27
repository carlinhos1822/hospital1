const API_URL = 'http://localhost:3000/api/alunos';
const form = document.getElementById('aluno-form');
const tbody = document.getElementById('aluno-tbody');
const btnCancel = document.getElementById('aluno-btnCancel');
const btnSave = document.getElementById('aluno-btnSave');

//Campos do forms
const inputId = document.getElementById('aluno-id');
const inputNome = document.getElementById('aluno-nome');
const inputEmail = document.getElementById('aluno-email');
const inputCurso = document.getElementById('aluno-Curso');

// Estado local
let editandoId = null;

// 1. LER (GET): Busca dados do Backend e renderizar na tela
async function carregarAlunos() {
    try {

        const resposta = await fetch(API_URL);
        const alunos = await resposta.json();

        tbody.innerHTML = '';

        if (alunos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"> Nenhum aluno cadastrado.</td></tr>';
            return;
        }

        alunos.forEach(aluno => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>#${aluno.id}</td>
                <td>#${aluno.nome}</td>
                <td>#${aluno.email}</td>
                <td>#${aluno.curso}</td>
                <td class="action">
                    <button class="btn-icon btn-edit" onclick="
                        iniciarEdiçao(${aluno.id},
                        '${aluno.nome}', '${aluno.email}',
                        '${aluno.curso}')">Editar</button>

                    <button class="btn-icon btn-delete"
                        onclick="deletarAluno(${aluno.id})">Excluir</button>
                </td>
            `;

            tbody.appendChild(tr);
        });

    } catch (erro) {
        console.error('erro ao buscar alunos:', erro);
        alert('erro de conexão com o servidor!');
    }
}

// 2. CRIAR ou ATUALIZAR (POST/PUT)
form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitar recarregar a pagina

    const aluno = {
        nome: inputNome.value,
        email: inputEmail.value,
        curso: inputCurso.value,
    };

    try {

        // se tem um id, estamos editando (PUT)
        if (editandoId) {

            await fetch(`${API_URL}/${editandoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(aluno)
            });

            editandoId = null; // reseta o estado

        } else {

            // se nao tem um id, estamos criando (POST)
            await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(aluno)
            });
        }

        resetarFormulario();
        carregarAlunos(); // recarregar a lista atualizada do backend

    } catch (erro) {
        console.error('erro ao salvar', erro);
    }
});
//3.DELETAR (DELETE)
async function deletarAluno(id) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) {
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
                 carregarAlunos(); // atualiza a lista
} catch (erro) {
        console.error('erro ao deletar:', erro);
}
        }

// ==========================================
// UTILITÁRIOS DA INTERFACE
// ==========================================

// Limpar o formulário
function resetarFormulario() {
    form.reset();

    inputId.value = '';

    editandoId = null;

    btnSave.textContent = 'Salvar';
}


// Preencher formulário para edição
function iniciarEdiçao(id, nome, email, curso) {

    inputId.value = id;
    inputNome.value = nome;
    inputEmail.value = email;
    inputCurso.value = curso;

    editandoId = id;

    btnSave.textContent = 'Atualizar';

    inputNome.focus();
}


// Botão cancelar
btnCancel.addEventListener('click', () => {
    resetarFormulario();
});


// Mostrar mensagem na interface
function mostrarMensagem(mensagem, tipo = 'sucesso') {

    alert(mensagem);
}


// Limpar mensagem ou estado da interface
function limparFormulario() {
    inputNome.value = '';
    inputEmail.value = '';
    inputCurso.value = '';

    inputNome.focus();
}


// Carregar alunos quando a página abrir
carregarAlunos();
















