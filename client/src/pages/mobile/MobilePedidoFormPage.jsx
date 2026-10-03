import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClientes } from '../../api/clientes';
import { createPedido } from '../../api/pedidos';
import { fetchProdutos } from '../../api/produtos';
import { fetchFreteCidades } from '../../api/config';
import MobileFloatField from '../../components/mobile/MobileFloatField';
import { showRequiredFieldsToast, showToast } from '../../utils/toast';
import { isCreditBlocked } from '../../utils/mobileStatus';

const UNIDADES = [
    { value: 'un', label: 'Unidade' },
    { value: 'milheiro', label: 'Milheiro' },
    { value: 'm²', label: 'm²' },
];

function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function priceForUnidade(produto, unidade) {
    if (!produto) return 0;
    if (unidade === 'milheiro') {
        return toNumber(produto.preco_milheiro) || toNumber(produto.preco_unitario);
    }
    if (unidade === 'm²') {
        return toNumber(produto.preco_m2) || toNumber(produto.preco_unitario);
    }
    return toNumber(produto.preco_unitario);
}

function defaultUnidade(produto) {
    const raw = String(produto?.unidade || 'un').trim().toLowerCase();
    if (raw === 'milheiro' || raw === 'milheiros') return 'milheiro';
    if (raw === 'm2' || raw === 'm²' || raw === 'm^2') return 'm²';
    return 'un';
}

function emptyItem() {
    return {
        produto_id: '',
        quantidade: '1',
        unidade: 'un',
        preco_unitario: '',
    };
}

export default function MobilePedidoFormPage() {
    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [fretes, setFretes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clienteId, setClienteId] = useState('');
    const [tipoEntrega, setTipoEntrega] = useState('a_definir');
    const [enderecoEntrega, setEnderecoEntrega] = useState('');
    const [formaPagamento, setFormaPagamento] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [itens, setItens] = useState([emptyItem()]);
    const [frete, setFrete] = useState(0);

    useEffect(() => {
        let active = true;
        Promise.all([fetchClientes(), fetchProdutos(), fetchFreteCidades()])
            .then(([cli, prod, fre]) => {
                if (!active) return;
                setClientes(Array.isArray(cli) ? cli.filter((c) => c.status !== 'Inativo') : []);
                setProdutos(Array.isArray(prod) ? prod.filter((p) => p.status !== 'Inativo') : []);
                setFretes(Array.isArray(fre) ? fre : []);
            })
            .catch((error) => showToast('error', error.message || 'Erro ao carregar dados.'))
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (tipoEntrega !== 'frota') {
            setFrete(0);
            return;
        }
        if (!clienteId || !clientes.length || !fretes.length) {
            setFrete(0);
            return;
        }
        const cli = clientes.find((c) => String(c.id) === String(clienteId));
        if (!cli) {
            setFrete(0);
            return;
        }
        const cidadeCli = (cli.cidade || '').trim().toLowerCase();
        const ufCli = (cli.estado || '').trim().toLowerCase();

        const match = fretes.find((f) => 
            (f.cidade || '').trim().toLowerCase() === cidadeCli &&
            (f.uf || '').trim().toLowerCase() === ufCli
        );
        if (match) {
            setFrete(toNumber(match.valor_frete));
        } else {
            setFrete(0);
        }
    }, [tipoEntrega, clienteId, clientes, fretes]);

    const total = useMemo(() => (
        itens.reduce((acc, item) => {
            const qtd = toNumber(item.quantidade);
            const preco = toNumber(item.preco_unitario);
            return acc + (qtd * preco);
        }, 0) + frete
    ), [itens, frete]);

    const updateItem = (index, patch) => {
        setItens((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };

    const handleProdutoChange = (index, produtoId) => {
        const produto = produtos.find((p) => String(p.id) === String(produtoId));
        const unidade = defaultUnidade(produto);
        updateItem(index, {
            produto_id: produtoId,
            unidade,
            preco_unitario: produto ? String(priceForUnidade(produto, unidade)) : '',
        });
    };

    const handleUnidadeChange = (index, unidade) => {
        const item = itens[index];
        const produto = produtos.find((p) => String(p.id) === String(item.produto_id));
        updateItem(index, {
            unidade,
            preco_unitario: produto ? String(priceForUnidade(produto, unidade)) : item.preco_unitario,
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!clienteId) {
            showRequiredFieldsToast();
            return;
        }

        const clienteSel = clientes.find((c) => String(c.id) === String(clienteId));
        if (isCreditBlocked(clienteSel?.status_credito)) {
            showToast('error', 'Crédito bloqueado. Não é possível criar pedido para este cliente.');
            return;
        }

        const parsedItens = itens
            .map((item) => ({
                produto_id: Number(item.produto_id),
                quantidade: toNumber(item.quantidade),
                preco_unitario: toNumber(item.preco_unitario),
                unidade: item.unidade || 'un',
            }))
            .filter((item) => item.produto_id > 0 && item.quantidade > 0);

        if (!parsedItens.length) {
            showToast('error', 'Informe ao menos um produto com quantidade.');
            return;
        }

        setSaving(true);
        try {
            await createPedido({
                cliente_id: Number(clienteId),
                data_pedido: new Date().toISOString().slice(0, 10),
                status: 'Pendente',
                origem: 'mobile',
                desconto: 0,
                frete: frete,
                forma_pagamento: formaPagamento || null,
                observacoes,
                tipo_entrega: tipoEntrega,
                endereco_entrega: enderecoEntrega,
                itens: parsedItens,
                pagamentos: [],
            });
            showToast('success', 'Pré-venda enviada. Aguarde confirmação da fábrica.');
            navigate('/mobile/pedidos');
        } catch (error) {
            showToast('error', error.message || 'Erro ao criar pedido.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p className="mobile-empty">Carregando...</p>;
    }

    return (
        <div className="mobile-page is-form-page">
            <div className="mobile-page-scroll">
                <form className="mobile-form" onSubmit={handleSubmit}>
                    <MobileFloatField
                        label="Cliente"
                        name="cliente_id"
                        as="select"
                        value={clienteId}
                        onChange={(e) => {
                            const newId = e.target.value;
                            setClienteId(newId);
                            if (newId) {
                                const cli = clientes.find(c => String(c.id) === String(newId));
                                if (cli) {
                                    const parts = [
                                        cli.endereco,
                                        cli.numero,
                                        cli.complemento,
                                        cli.bairro,
                                        cli.cidade ? `${cli.cidade}` : '',
                                        cli.estado ? `- ${cli.estado}` : '',
                                        cli.cep ? `CEP: ${cli.cep}` : ''
                                    ].filter(Boolean).join(' ');
                                    setEnderecoEntrega(parts);
                                }
                            } else {
                                setEnderecoEntrega('');
                            }
                        }}
                        required
                    >
                        <option value="">Selecione...</option>
                        {clientes.map((cliente) => {
                            const blocked = isCreditBlocked(cliente.status_credito);
                            return (
                                <option key={cliente.id} value={cliente.id} disabled={blocked}>
                                    {cliente.nome_razao_social}{blocked ? ' (crédito bloqueado)' : ''}
                                </option>
                            );
                        })}
                    </MobileFloatField>

                    <div className="mobile-itens">
                        <div className="mobile-section-head">
                            <h3>Produtos</h3>
                            <button
                                type="button"
                                className="mobile-link-btn"
                                onClick={() => setItens((current) => [...current, emptyItem()])}
                            >
                                + item
                            </button>
                        </div>

                        {itens.map((item, index) => (
                            <div key={`item-${index}`} className="mobile-item-card">
                                <MobileFloatField
                                    label="Produto"
                                    name={`produto_${index}`}
                                    as="select"
                                    value={item.produto_id}
                                    onChange={(e) => handleProdutoChange(index, e.target.value)}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {produtos.map((produto) => (
                                        <option key={produto.id} value={produto.id}>
                                            {produto.nome}
                                        </option>
                                    ))}
                                </MobileFloatField>

                                <MobileFloatField
                                    label="Unidade"
                                    name={`unidade_${index}`}
                                    as="select"
                                    value={item.unidade || 'un'}
                                    onChange={(e) => handleUnidadeChange(index, e.target.value)}
                                    required
                                >
                                    {UNIDADES.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </MobileFloatField>

                                <div className="mobile-form-row">
                                    <MobileFloatField
                                        label="Qtd"
                                        name={`qtd_${index}`}
                                        type="number"
                                        value={item.quantidade}
                                        onChange={(e) => updateItem(index, { quantidade: e.target.value })}
                                        required
                                    />
                                    <MobileFloatField
                                        label="Preço"
                                        name={`preco_${index}`}
                                        type="number"
                                        value={item.preco_unitario}
                                        onChange={(e) => updateItem(index, { preco_unitario: e.target.value })}
                                        required
                                    />
                                </div>
                                {itens.length > 1 && (
                                    <button
                                        type="button"
                                        className="mobile-link-btn is-danger"
                                        onClick={() => setItens((current) => current.filter((_, i) => i !== index))}
                                    >
                                        Remover item
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <MobileFloatField
                        label="Tipo de Entrega / Recolha"
                        name="tipo_entrega"
                        as="select"
                        value={tipoEntrega}
                        onChange={(e) => setTipoEntrega(e.target.value)}
                    >
                        <option value="a_definir">A definir</option>
                        <option value="frota">Entrega pela fábrica</option>
                        <option value="externo">Entrega terceirizada</option>
                        <option value="retirada">Retirar na fábrica (Recolha)</option>
                    </MobileFloatField>

                    {tipoEntrega !== 'retirada' && (
                        <MobileFloatField
                            label="Endereço de Entrega Completo"
                            name="endereco_entrega"
                            type="text"
                            value={enderecoEntrega}
                            onChange={(e) => setEnderecoEntrega(e.target.value)}
                        />
                    )}

                    <MobileFloatField
                        label="Forma de Pagamento (Opcional)"
                        name="forma_pagamento"
                        as="select"
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value)}
                    >
                        <option value="">A combinar com a fábrica</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="PIX">PIX</option>
                        <option value="Cartão de crédito">Cartão de crédito</option>
                        <option value="Cartão de débito">Cartão de débito</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Transferência">Transferência</option>
                        <option value="A prazo">A prazo</option>
                    </MobileFloatField>

                    <MobileFloatField
                        label="Observações"
                        name="observacoes"
                        as="textarea"
                        rows={3}
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                    />

                    <div className="mobile-total" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8, fontSize: '0.9rem' }}>
                            <span>Subtotal:</span>
                            <span>{money(total - frete)}</span>
                        </div>
                        {frete > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8, fontSize: '0.9rem' }}>
                                <span>Frete:</span>
                                <span>{money(frete)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '1.2rem', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                            <span>Total do Pedido:</span>
                            <span style={{ color: 'var(--primary)' }}>{money(total)}</span>
                        </div>
                    </div>

                    <button type="submit" className="mobile-submit" disabled={saving || !clientes.length}>
                        {saving ? 'Enviando...' : 'Enviar pré-venda'}
                    </button>
                    {!clientes.length && (
                        <p className="mobile-empty">Cadastre um cliente antes de criar o pedido.</p>
                    )}
                </form>
            </div>
        </div>
    );
}
