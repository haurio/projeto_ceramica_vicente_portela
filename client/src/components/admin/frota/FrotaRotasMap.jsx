import { useEffect, useRef, useState } from 'react';
import { Modal, Table } from 'react-bootstrap';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchRotasEntrega } from '../../../api/config';
import { showToast } from '../../../utils/toast';
import AdminModalClose from '../AdminModalClose';

const markerIcon = L.divIcon({
    className: 'admin-frota-map-pin',
    html: '<span></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

const origemIcon = L.divIcon({
    className: 'admin-frota-map-pin is-origem',
    html: '<span></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

function formatDuracao(minutos) {
    const total = Math.max(0, Math.round(Number(minutos) || 0));
    if (!total) return '—';
    const horas = Math.floor(total / 60);
    const mins = total % 60;
    if (horas <= 0) return `${mins} min`;
    return `${horas}h ${String(mins).padStart(2, '0')}min`;
}

export default function FrotaRotasMap({
    show = false,
    onHide = null,
    onDone = null,
    embedded = false,
}) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const layerRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const isModal = !embedded;

    const load = async () => {
        setLoading(true);
        try {
            const payload = await fetchRotasEntrega();
            setData(payload);
            if (Array.isArray(payload?.destinos) && !payload.destinos.length) {
                showToast('warning', 'Nenhuma cidade cadastrada em Custo de frete.');
            } else if (typeof onDone === 'function') {
                onDone(payload);
            }
        } catch (error) {
            showToast('error', error.message || 'Erro ao calcular rotas.');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isModal && !show) return undefined;
        if (!mapRef.current || mapInstance.current) return undefined;

        mapInstance.current = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: true,
        }).setView([-18.9, -48.3], 8);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap',
        }).addTo(mapInstance.current);

        layerRef.current = L.layerGroup().addTo(mapInstance.current);

        setTimeout(() => mapInstance.current?.invalidateSize(), 180);

        return () => {
            mapInstance.current?.remove();
            mapInstance.current = null;
        };
    }, [isModal, show]);

    useEffect(() => {
        if (isModal && show) {
            setTimeout(() => mapInstance.current?.invalidateSize(), 220);
            if (!data && !loading) load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isModal, show]);

    useEffect(() => {
        if (!mapInstance.current || !layerRef.current || !data) return;

        layerRef.current.clearLayers();
        const points = [];

        if (data.origem?.latitude != null && data.origem?.longitude != null) {
            const latlng = [data.origem.latitude, data.origem.longitude];
            points.push(latlng);
            L.marker(latlng, { icon: origemIcon })
                .bindPopup(`<strong>${data.origem.label}</strong><br/>${data.origem.cidade}/${data.origem.uf}`)
                .addTo(layerRef.current);
        }

        (data.destinos || []).forEach((destino) => {
            if (destino.latitude == null || destino.longitude == null) return;
            const latlng = [destino.latitude, destino.longitude];
            points.push(latlng);
            L.marker(latlng, { icon: markerIcon })
                .bindPopup(
                    `<strong>${destino.cidade}/${destino.uf}</strong><br/>`
                    + `${destino.distancia_km != null ? `${destino.distancia_km} km` : 'Distância indisponível'}<br/>`
                    + `${destino.duracao_min != null ? `Caminhão: ${formatDuracao(destino.duracao_min)}` : ''}<br/>`
                    + (destino.valor_frete != null
                        ? Number(destino.valor_frete).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '')
                )
                .addTo(layerRef.current);

            const geometry = Array.isArray(destino.geometry) && destino.geometry.length > 1
                ? destino.geometry
                : (data.origem?.latitude != null
                    ? [[data.origem.latitude, data.origem.longitude], latlng]
                    : null);

            if (geometry) {
                L.polyline(geometry, { color: '#9b1c1c', weight: 3, opacity: 0.7 })
                    .addTo(layerRef.current);
            }
        });

        if (points.length) {
            mapInstance.current.fitBounds(points, { padding: [28, 28] });
        }
        setTimeout(() => mapInstance.current?.invalidateSize(), 120);
    }, [data]);

    const content = (
        <div className={`admin-frota-rotas${isModal ? ' is-modal' : ''}`}>
            {!isModal ? (
                <header className="admin-frota-rotas-head">
                    <div>
                        <h3>Rotas de entrega</h3>
                        <p>Distância por estrada da cerâmica até as cidades cadastradas em Custo de frete.</p>
                    </div>
                    <button
                        type="button"
                        className="admin-config-btn is-primary"
                        onClick={load}
                        disabled={loading}
                    >
                        {loading ? 'Calculando...' : 'Calcular distâncias'}
                    </button>
                </header>
            ) : null}

            <div className="admin-frota-rotas-grid">
                <div className="admin-frota-map" ref={mapRef} />
                <div className="admin-frota-rotas-panel">
                    <div className="admin-frota-rotas-panel-head">
                        {data?.origem ? (
                            <p className="admin-frota-origem mb-0">
                                <i className="fas fa-industry" aria-hidden="true" />
                                Origem: <strong>{data.origem.label}</strong> — {data.origem.cidade}/{data.origem.uf}
                            </p>
                        ) : (
                            <p className="text-muted mb-0">
                                {loading ? 'Consultando rotas...' : 'Aguardando cálculo das distâncias.'}
                            </p>
                        )}
                        {isModal ? (
                            <button
                                type="button"
                                className="admin-config-btn is-primary"
                                onClick={load}
                                disabled={loading}
                            >
                                {loading ? 'Calculando...' : 'Recalcular'}
                            </button>
                        ) : null}
                    </div>

                    <div className="admin-frota-rotas-list">
                        {loading && !data ? (
                            <p className="text-muted mb-0">Consultando rotas (pode levar alguns segundos)...</p>
                        ) : null}
                        {data?.destinos?.length ? (
                            <div className="admin-frota-rotas-table-wrap">
                                <Table bordered hover size="sm" className="mb-0 align-middle admin-frota-rotas-table">
                                    <thead>
                                        <tr>
                                            <th>Cidade</th>
                                            <th>Km</th>
                                            <th>Tempo caminhão</th>
                                            <th>Frete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.destinos.map((item) => (
                                            <tr key={`${item.id || item.cidade}-${item.uf}`}>
                                                <td>{item.cidade}/{item.uf}</td>
                                                <td>{item.distancia_km != null ? `${item.distancia_km} km` : '—'}</td>
                                                <td>{formatDuracao(item.duracao_min)}</td>
                                                <td>
                                                    {item.valor_frete != null
                                                        ? Number(item.valor_frete).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                        : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        ) : null}
                        {data && !loading && !(data.destinos || []).length ? (
                            <p className="text-muted mb-0">Nenhuma cidade cadastrada em Custo de frete.</p>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );

    if (!isModal) return content;

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            size="xl"
            dialogClassName="admin-frota-rotas-dialog"
            backdrop="static"
            className="admin-frota-rotas-modal"
        >
            <Modal.Header className="admin-frota-rotas-modal-header">
                <Modal.Title>
                    <i className="fas fa-route me-2" aria-hidden="true" />
                    Calcular distâncias
                </Modal.Title>
                <AdminModalClose onClick={onHide} disabled={loading} />
            </Modal.Header>
            <Modal.Body className="admin-frota-rotas-modal-body">
                {content}
            </Modal.Body>
            <Modal.Footer className="admin-frota-rotas-modal-footer">
                <button type="button" className="admin-config-btn is-muted" onClick={onHide} disabled={loading}>
                    Fechar
                </button>
            </Modal.Footer>
        </Modal>
    );
}
