# Documentação da API - Portal Solidário

Esta documentação descreve os endpoints da API do Portal Solidário, seus respectivos métodos, funções e níveis de acesso.

### 1. Autenticação e Cadastros
| Método | Endpoint | Descrição | Acesso |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/clients` | Cadastra um novo beneficiário (Nome, Email, Telefone, Senha). | Público |
| **POST** | `/api/users` | Cadastra um membro da equipe (Admin ou Staff). | SuperAdmin |
| **POST** | `/api/auth/login` | Recebe email/senha, identifica se é cliente ou equipe e devolve o Token JWT. | Público |

### 2. Catálogo de Serviços (`services`)
| Método | Endpoint | Descrição | Acesso |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/services` | Retorna a lista de todos os serviços solidários disponíveis. | Público |
| **POST** | `/api/services` | Adiciona um novo serviço (ex: Corte, Manicure). | Admin |
| **PUT** | `/api/services/:id` | Atualiza dados de um serviço (duração, descrição). | Admin |

### 3. Gestão de Calendário (`holidays`)
| Método | Endpoint | Descrição | Acesso |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/holidays` | Retorna um array com todas as datas bloqueadas para o React desabilitar. | Autenticado |
| **POST** | `/api/holidays` | Bloqueia um dia específico no calendário (Feriados ou imprevistos). | Admin |
| **DELETE** | `/api/holidays/:id` | Remove o bloqueio de uma data, liberando a vaga no sistema. | Admin |

### 4. Agendamentos (`appointments`)
| Método | Endpoint | Descrição | Acesso |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/appointments` | Cria um agendamento. **Regra:** Valida se a data já possui algum agendamento e barra duplicidades. | Cliente |
| **GET** | `/api/appointments` | Lista a agenda. Se for cliente, vê apenas os seus. Se for equipe, vê o calendário geral. | Autenticado |
| **PATCH** | `/api/appointments/:id/status` | Altera apenas o status (`PENDING`, `CONFIRMED`, `CANCELED`, `COMPLETED`). | Autenticado |
| **PATCH** | `/api/appointments/:id/staff` | Atribui qual profissional (Staff) fará o atendimento daquela vaga. | Admin |

### 5. Gestão de Usuários e Segurança (`users`)
| Método | Endpoint | Descrição | Acesso |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/users` | Retorna a lista de membros da equipe cadastrados (usado para popular selects). | Admin |
| **PATCH** | `/api/users/:id/role` | Altera o nível de acesso (`role`) de um membro da equipe. | SuperAdmin |
| **PATCH** | `/api/users/:id/reset-password` | Gera uma senha provisória e ativa a obrigatoriedade de troca (`must_change_password`). | SuperAdmin |
| **PATCH** | `/api/users/update-password` | Cadastra a nova senha definitiva do usuário e desativa a trava de redefinição. | Autenticado |