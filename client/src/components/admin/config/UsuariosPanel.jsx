import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Modal, Table } from 'react-bootstrap';
import {
    createUsuario,
    deleteUsuario,
    fetchUsuarios,
    updateUsuario,
} from '../../../api/config';
import { useAuth } from '../../../context/AuthContext';
import {
    USER_PERFIS,
    defaultPermissoesPorPerfil,
    getAdminPageAccessList,
} from '../../../data/adminNav';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminStatusToggle from '../AdminStatusToggle';
import FormSection from '../FormSection';
import StatusBadge from '../StatusBadge';

function emptyForm() {
    return {
        full_name: '',
        username: '',
        email: '',
        password: '',
        status: 'Ativo',
        perfil: 'Administrativo',
        forcar_troca_senha: true,
        permissoes: [],
    };
}

function normalizeForm(data = {}) {
    const perfil = USER_PERFIS.includes(data.perfil) ? data.perfil : 'Administrador';
    return {
        full_name: data.full_name || '',
        username: data.username || '',
        email: data.email || '',
        password: '',
        status: data.status === 'Inativo' ? 'Inativo' : 'Ativo',
        perfil,
        forcar_troca_senha: Boolean(data.forcar_troca_senha),
        permissoes: Array.isArray(data.permissoes) && data.permissoes.length
            ? data.permissoes
            : defaultPermissoesPorPerfil(perfil),
    };
}

export default function UsuariosPanel() {
    const { user, refreshSession } = useAuth();
    const paginas = useMemo(() => getAdminPageAccessList(), []);
    const grupos = useMemo(() => {
        const map = new Map();
        paginas.forEach((page) => {
            const group = page.group || 'Outros';
            if (!map.has(group)) map.set(group, []);
            map.get(group).push(page);
        });
        return [...map.entries()];
    }, [paginas]);

    const [itens, setItens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [mode, setMode] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [invalidFields, setInvalidFields] = useState({});
    const [query, setQuery] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchUsuarios();
            setItens(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar usuários.');
            setItens([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return itens;
        return itens.filter((item) => (
            String(item.full_name || '').toLowerCase().includes(q)
            || String(item.username || '').toLowerCase().includes(q)
            || String(item.email || '').toLowerCase().includes(q)
            || String(item.perfil || '').toLowerCase().includes(q)
        ));
    }, [itens, query]);

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm());
        setInvalidFields({});
        setShowDeleteConfirm(false);
        setShowPassword(false);
        setMode('create');
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setForm(normalizeForm(item));
        setInvalidFields({});
        setShowDeleteConfirm(false);
        setShowPassword(false);
        setMode('edit');
    };

    const closeEditor = () => {
        setMode('list');
        setEditingId(null);
        setForm(emptyForm());
        setInvalidFields({});
        setShowDeleteConfirm(false);
        setShowPassword(false);
    };

    const handlePerfilChange = (perfil) => {
        setForm((current) => ({
            ...current,
            perfil,
            // Em novo usuário os módulos começam desmarcados; o admin habilita o que quiser.
            permissoes: mode === 'create' ? current.permissoes : defaultPermissoesPorPerfil(perfil),
        }));
        setInvalidFields((current) => ({ ...current, permissoes: false }));
    };

    const togglePagina = (path) => {
        setForm((current) => {
            const has = current.permissoes.includes(path);
            return {
                ...current,
                permissoes: has
                    ? current.permissoes.filter((item) => item !== path)
                    : [...current.permissoes, path],
            };
        });
    };

    const toggleGrupo = (paths, checked) => {
        setForm((current) => {
            const set = new Set(current.permissoes);
            paths.forEach((path) => {
                if (checked) set.add(path);
                else set.delete(path);
            });
            return { ...current, permissoes: [...set] };
        });
    };

    const selectAllPages = () => {
        setForm((current) => ({
            ...current,
            permissoes: paginas.map((item) => item.to),
        }));
    };

    const clearPages = () => {
        setForm((current) => ({ ...current, permissoes: [] }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextInvalid = {};
        if (!form.full_name.trim()) nextInvalid.full_name = true;
        if (!form.username.trim()) nextInvalid.username = true;
        if (!form.email.trim()) nextInvalid.email = true;
        if (mode === 'create' && !form.password) nextInvalid.password = true;
        if (form.password && form.password.length < 8) nextInvalid.password = true;
        if (!form.permissoes.length) {
            nextInvalid.permissoes = true;
        }
        setInvalidFields(nextInvalid);
        if (Object.keys(nextInvalid).length) {
            showRequiredFieldsToast();
            return;
        }

        const payload = {
            full_name: form.full_name.trim(),
            username: form.username.trim(),
            email: form.email.trim(),
            status: form.status,
            perfil: form.perfil,
            forcar_troca_senha: Boolean(form.forcar_troca_senha),
            permissoes: form.permissoes,
        };
        if (form.password) payload.password = form.password;

        setSaving(true);
        try {
            if (editingId) {
                await updateUsuario(editingId, payload);
                showToast('success', 'Usuário atualizado.');
                if (Number(user?.id) === Number(editingId)) {
                    await refreshSession();
                }
            } else {
                await createUsuario(payload);
                showToast('success', 'Usuário criado.');
            }
            closeEditor();
            await load();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar usuário.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingId) return;
        setDeleting(true);
        try {
            await deleteUsuario(editingId);
            showToast('success', 'Usuário excluído.');
            closeEditor();
            await load();
        } catch (error) {
            showToast('error', error.message || 'Erro ao excluir usuário.');
        } finally {
            setDeleting(false);
        }
    };

    if (mode === 'create' || mode === 'edit') {
        return (
            <>
                <Form className="admin-funcionario-form admin-config-forma-editor admin-usuarios-editor" onSubmit={handleSubmit}>
                    <FormSection title={mode === 'edit' ? 'Editar usuário' : 'Novo usuário'}>
                        <p className="admin-config-section-hint">
                            Dados de acesso, perfil e páginas liberadas no sistema.
                        </p>

                        <div className="admin-usuarios-row-3">
                            <AdminFloatField
                                label="Nome completo"
                                name="full_name"
                                value={form.full_name}
                                onChange={(event) => setForm((current) => ({
                                    ...current,
                                    full_name: event.target.value,
                                }))}
                                required
                                isInvalid={Boolean(invalidFields.full_name)}
                                disabled={saving || deleting}
                            />
                            <AdminFloatField
                                label="Usuário (login)"
                                name="username"
                                value={form.username}
                                onChange={(event) => setForm((current) => ({
                                    ...current,
                                    username: event.target.value,
                                }))}
                                required
                                isInvalid={Boolean(invalidFields.username)}
                                disabled={saving || deleting}
                            />
                            <AdminFloatField
                                label="E-mail"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={(event) => setForm((current) => ({
                                    ...current,
                                    email: event.target.value,
                                }))}
                                required
                                isInvalid={Boolean(invalidFields.email)}
                                disabled={saving || deleting}
                            />
                        </div>

                        <div className="admin-usuarios-row-3">
                            <AdminFloatField
                                label={mode === 'edit' ? 'Nova senha (opcional)' : 'Senha'}
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={(event) => setForm((current) => ({
                                    ...current,
                                    password: event.target.value,
                                }))}
                                required={mode === 'create'}
                                isInvalid={Boolean(invalidFields.password)}
                                disabled={saving || deleting}
                                autoComplete="new-password"
                                showPasswordToggle
                                showPassword={showPassword}
                                onTogglePassword={() => setShowPassword((current) => !current)}
                            />
                            <AdminFloatField
                                as="select"
                                label="Perfil"
                                name="perfil"
                                value={form.perfil}
                                onChange={(event) => handlePerfilChange(event.target.value)}
                                disabled={saving || deleting}
                            >
                                {USER_PERFIS.map((perfil) => (
                                    <option key={perfil} value={perfil}>{perfil}</option>
                                ))}
                            </AdminFloatField>
                            <AdminStatusToggle
                                label="Status"
                                name="status"
                                checked={form.status === 'Ativo'}
                                onLabel="Ativo"
                                offLabel="Inativo"
                                onChange={(event) => setForm((current) => ({
                                    ...current,
                                    status: event.target.checked ? 'Ativo' : 'Inativo',
                                }))}
                                disabled={saving || deleting}
                            />
                        </div>

                        <div className="admin-usuarios-force-password">
                            <AdminStatusToggle
                                label="Forçar troca de senha no próximo login"
                                name="forcar_troca_senha"
                                checked={Boolean(form.forcar_troca_senha)}
                                onLabel="Sim"
                                offLabel="Não"
                                onChange={(event) => setForm((current) => ({
                                    ...current,
                                    forcar_troca_senha: Boolean(event.target.checked),
                                }))}
                                disabled={saving || deleting}
                            />
                            <p className="admin-config-section-hint mb-0">
                                Ao logar, o sistema bloqueia o uso até o usuário definir uma nova senha forte.
                            </p>
                        </div>
                    </FormSection>

                    <FormSection title="Acesso às páginas">
                        <div className="admin-usuarios-perm-head">
                            <p className="admin-config-section-hint mb-0">
                                {mode === 'create'
                                    ? 'Todos os módulos começam desativados — habilite apenas o que o usuário poderá acessar.'
                                    : 'Ative ou desative as páginas que este usuário poderá abrir no menu.'}
                            </p>
                            <div className="admin-usuarios-perm-actions">
                                <button
                                    type="button"
                                    className="admin-usuarios-text-action"
                                    onClick={selectAllPages}
                                    disabled={saving || deleting}
                                >
                                    Marcar todas
                                </button>
                                <span aria-hidden="true">·</span>
                                <button
                                    type="button"
                                    className="admin-usuarios-text-action"
                                    onClick={clearPages}
                                    disabled={saving || deleting}
                                >
                                    Limpar
                                </button>
                            </div>
                        </div>

                        <div className={`admin-usuarios-perm-matrix${invalidFields.permissoes ? ' is-invalid' : ''}`}>
                            {grupos.map(([groupLabel, pages]) => {
                                const paths = pages.map((page) => page.to);
                                const checkedCount = paths.filter((path) => form.permissoes.includes(path)).length;
                                const allChecked = checkedCount === paths.length;

                                return (
                                    <div className="admin-usuarios-perm-group" key={groupLabel}>
                                        <div className="admin-usuarios-perm-group-head">
                                            <button
                                                type="button"
                                                className="admin-usuarios-text-action"
                                                onClick={() => toggleGrupo(paths, !allChecked)}
                                                disabled={saving || deleting}
                                            >
                                                <strong>{groupLabel}</strong>
                                            </button>
                                            <span>{checkedCount}/{paths.length}</span>
                                        </div>
                                        <div className="admin-usuarios-perm-grid">
                                            {pages.map((page) => {
                                                const checked = form.permissoes.includes(page.to);
                                                return (
                                                    <button
                                                        key={page.to}
                                                        type="button"
                                                        className={`admin-usuarios-perm-item${checked ? ' is-on' : ''}`}
                                                        onClick={() => togglePagina(page.to)}
                                                        disabled={saving || deleting}
                                                        aria-pressed={checked}
                                                    >
                                                        <span
                                                            className={`admin-usuarios-mini-switch${checked ? ' is-on' : ''}`}
                                                            aria-hidden="true"
                                                        >
                                                            <span className="admin-usuarios-mini-switch-knob" />
                                                        </span>
                                                        <i className={`fas ${page.icon || 'fa-file'}`} aria-hidden="true" />
                                                        <span className="admin-usuarios-perm-label">{page.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </FormSection>

                    <div className="admin-config-editor-actions">
                        <Button
                            type="button"
                            className="admin-config-btn is-muted"
                            onClick={closeEditor}
                            disabled={saving || deleting}
                        >
                            Voltar
                        </Button>
                        {mode === 'edit' ? (
                            <Button
                                type="button"
                                className="admin-config-btn is-danger"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={saving || deleting}
                            >
                                Excluir
                            </Button>
                        ) : null}
                        <Button
                            type="submit"
                            className="admin-config-btn is-primary"
                            disabled={saving || deleting}
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </div>
                </Form>

                <Modal
                    show={showDeleteConfirm}
                    onHide={() => (deleting ? null : setShowDeleteConfirm(false))}
                    centered
                    backdrop="static"
                    className="admin-delete-confirm-modal"
                >
                    <Modal.Header className="admin-delete-confirm-header">
                        <Modal.Title>
                            <i className="fas fa-exclamation-triangle me-2" aria-hidden="true" />
                            Confirmar exclusão
                        </Modal.Title>
                        <AdminModalClose onClick={() => setShowDeleteConfirm(false)} disabled={deleting} />
                    </Modal.Header>
                    <Modal.Body className="admin-delete-confirm-body">
                        <p>
                            Deseja realmente excluir o usuário
                            {' '}
                            <strong>{form.full_name?.trim() || form.username || 'selecionado'}</strong>
                            ?
                        </p>
                        <p className="admin-delete-confirm-note">Essa ação não poderá ser desfeita.</p>
                    </Modal.Body>
                    <Modal.Footer className="admin-delete-confirm-footer">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={deleting}
                        >
                            Cancelar
                        </Button>
                        <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Excluindo...' : 'Sim, excluir'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </>
        );
    }

    return (
        <div className="admin-usuarios-list">
            <div className="admin-usuarios-toolbar">
                <div className={`admin-nfe-search-expand${query ? ' is-open' : ''}`}>
                    <i className="fas fa-search" aria-hidden="true" />
                    <input
                        type="search"
                        className="admin-nfe-search-input"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Nome, usuário, e-mail, perfil..."
                        aria-label="Buscar usuários"
                    />
                </div>
                <Button type="button" className="admin-config-btn is-primary" onClick={openCreate}>
                    <i className="fas fa-plus me-2" aria-hidden="true" />
                    Novo usuário
                </Button>
            </div>

            <div className="admin-table-scroll admin-usuarios-table-scroll">
                <Table hover className="mb-0 align-middle admin-usuarios-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Usuário</th>
                            <th>E-mail</th>
                            <th>Perfil</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="text-muted">Carregando usuários...</td>
                            </tr>
                        ) : null}
                        {!loading && filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-muted">Nenhum usuário encontrado.</td>
                            </tr>
                        ) : null}
                        {!loading && filtered.map((item) => (
                            <tr
                                key={item.id}
                                style={{ cursor: 'pointer' }}
                                onClick={() => openEdit(item)}
                            >
                                <td>{item.full_name || ''}</td>
                                <td>{item.username || ''}</td>
                                <td>{item.email || ''}</td>
                                <td>{item.perfil || ''}</td>
                                <td><StatusBadge status={item.status || 'Ativo'} /></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} className="admin-table-footer">
                                Total de usuários:
                                {' '}
                                <strong>{loading ? '—' : filtered.length}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </Table>
            </div>
        </div>
    );
}
