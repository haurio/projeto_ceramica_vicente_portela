import { useEffect, useRef, useState } from 'react';
import { Modal } from 'bootstrap';
import { PRODUCT_SPECS, WHATSAPP_URL } from '../data/landingData';
import { calculatePieces, getProductSpecs, logClientError } from '../utils/landingUtils';
import { showToast } from '../utils/toast';

export default function ProductModal({ product, show, onHide }) {
    const modalRef = useRef(null);
    const bsModalRef = useRef(null);
    const [altura, setAltura] = useState('');
    const [comprimento, setComprimento] = useState('');
    const [resultado, setResultado] = useState(null);

    useEffect(() => {
        if (!modalRef.current) return undefined;

        bsModalRef.current = Modal.getOrCreateInstance(modalRef.current);

        const handleHidden = () => {
            setAltura('');
            setComprimento('');
            setResultado(null);
            onHide();
        };

        modalRef.current.addEventListener('hidden.bs.modal', handleHidden);
        return () => modalRef.current?.removeEventListener('hidden.bs.modal', handleHidden);
    }, [onHide]);

    useEffect(() => {
        if (!bsModalRef.current) return;

        if (show) {
            bsModalRef.current.show();
        } else {
            bsModalRef.current.hide();
        }
    }, [show]);

    useEffect(() => {
        if (show && product) {
            setAltura('');
            setComprimento('');
            setResultado(null);
        }
    }, [show, product]);

    if (!product) return null;

    const productName = product.name.toLowerCase();
    const specs = getProductSpecs(productName, PRODUCT_SPECS);
    const pecasPorMetroQuadrado = Math.ceil(1 / ((specs.altura / 100) * (specs.largura / 100)));
    const whatsappText = encodeURIComponent(`Olá! Gostaria de um orçamento para ${product.name}.`);

    const handleCalculate = () => {
        try {
            const alturaValue = parseFloat(altura) || 0;
            const comprimentoValue = parseFloat(comprimento) || 0;

            if (alturaValue > 0 && comprimentoValue > 0) {
                const totalPecas = calculatePieces(alturaValue, comprimentoValue, specs);
                setResultado(totalPecas);
                return;
            }

            setResultado(null);
            showToast('warning', 'Por favor, insira valores válidos para altura e comprimento.', 'Aviso');
        } catch (error) {
            logClientError('Erro ao executar cálculo da calculadora', error);
            showToast('error', `Erro ao calcular: ${error.message}`, 'Erro');
        }
    };

    return (
        <div
            className="modal fade product-modal"
            id="productModal"
            tabIndex="-1"
            aria-labelledby="productModalLabel"
            aria-hidden="true"
            ref={modalRef}
        >
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable product-modal-dialog">
                <div className="modal-content product-modal-content">
                    <div className="modal-header product-modal-header">
                        <div>
                            <span className="product-modal-eyebrow">Detalhes do produto</span>
                            <h2 className="modal-title" id="productModalLabel">{product.name}</h2>
                        </div>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fechar" />
                    </div>
                    <div className="modal-body product-modal-body">
                        <div className="product-modal-layout">
                            <div className="product-modal-visual">
                                <img src={product.image} alt={product.alt} className="product-modal-image" />
                            </div>

                            <div className="product-modal-panel">
                                <div className="product-modal-specs">
                                    <div className="product-spec-card">
                                        <i className="fas fa-weight-hanging" aria-hidden="true" />
                                        <div>
                                            <span>Peso</span>
                                            <strong>{specs.peso}</strong>
                                        </div>
                                    </div>
                                    <div className="product-spec-card">
                                        <i className="fas fa-layer-group" aria-hidden="true" />
                                        <div>
                                            <span>Peças/m²</span>
                                            <strong>{pecasPorMetroQuadrado} un.</strong>
                                        </div>
                                    </div>
                                    <div className="product-spec-card">
                                        <i className="fas fa-ruler-combined" aria-hidden="true" />
                                        <div>
                                            <span>Medidas</span>
                                            <strong>{specs.altura}×{specs.largura} cm</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="product-modal-calculator">
                                    <h3>Calcule a quantidade da sua obra</h3>
                                    <p>Informe altura e comprimento da área em metros.</p>
                                    <div className="product-modal-inputs">
                                        <input
                                            type="number"
                                            placeholder="Altura (m)"
                                            min="0"
                                            step="0.1"
                                            value={altura}
                                            onChange={(event) => setAltura(event.target.value)}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Comprimento (m)"
                                            min="0"
                                            step="0.1"
                                            value={comprimento}
                                            onChange={(event) => setComprimento(event.target.value)}
                                        />
                                        <button type="button" className="product-modal-calc-btn" onClick={handleCalculate}>
                                            Calcular
                                        </button>
                                    </div>
                                    {resultado !== null && (
                                        <div className="product-modal-result">
                                            <span>Quantidade estimada</span>
                                            <strong>{resultado} unidades</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer product-modal-footer">
                        <p className="product-modal-footer-note">
                            Entregamos em Minas Gerais e região. Valores e frete sob consulta.
                        </p>
                        <div className="product-modal-actions">
                            <a
                                href={`${WHATSAPP_URL}&text=${whatsappText}`}
                                className="product-modal-whatsapp"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <i className="fab fa-whatsapp" aria-hidden="true" />
                                Solicitar orçamento
                            </a>
                            <button type="button" className="product-modal-close-btn" data-bs-dismiss="modal">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
