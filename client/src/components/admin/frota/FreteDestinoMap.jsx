import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchFreteCidadeRota, fetchRotaCidade } from '../../../api/config';
import { showToast } from '../../../utils/toast';

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
    if (!total) return null;
    const horas = Math.floor(total / 60);
    const mins = total % 60;
    if (horas <= 0) return `${mins} min`;
    return `${horas}h ${String(mins).padStart(2, '0')}min`;
}

export default function FreteDestinoMap({ freteId = null, cidade = '', uf = '' }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const layerRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [rota, setRota] = useState(null);

    useEffect(() => {
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

        return () => {
            mapInstance.current?.remove();
            mapInstance.current = null;
        };
    }, []);

    useEffect(() => {
        let active = true;
        const city = String(cidade || '').trim();
        const state = String(uf || '').trim().toUpperCase();

        if (!freteId && (!city || !state)) {
            setRota(null);
            return undefined;
        }

        setLoading(true);
        const request = (city && state)
            ? fetchRotaCidade({ cidade: city, uf: state })
            : fetchFreteCidadeRota(freteId);

        request
            .then((payload) => {
                if (!active) return;
                setRota(payload);
            })
            .catch((error) => {
                if (!active) return;
                setRota(null);
                showToast('error', error.message || 'Erro ao calcular rota no mapa.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [freteId, cidade, uf]);

    useEffect(() => {
        if (!mapInstance.current || !layerRef.current) return;
        layerRef.current.clearLayers();
        if (!rota) return;

        const points = [];
        if (rota.origem?.latitude != null && rota.origem?.longitude != null) {
            const latlng = [rota.origem.latitude, rota.origem.longitude];
            points.push(latlng);
            L.marker(latlng, { icon: origemIcon })
                .bindPopup(`<strong>${rota.origem.label || 'Cerâmica'}</strong><br/>${rota.origem.cidade}/${rota.origem.uf}`)
                .addTo(layerRef.current);
        }

        if (rota.destino?.latitude != null && rota.destino?.longitude != null) {
            const latlng = [rota.destino.latitude, rota.destino.longitude];
            points.push(latlng);
            const tempo = formatDuracao(rota.destino.duracao_min);
            L.marker(latlng, { icon: markerIcon })
                .bindPopup(
                    `<strong>${rota.destino.cidade}/${rota.destino.uf}</strong><br/>`
                    + `${rota.destino.distancia_km != null ? `${rota.destino.distancia_km} km` : ''}`
                    + (tempo ? `<br/>Caminhão: ${tempo}` : '')
                )
                .addTo(layerRef.current);
        }

        const geometry = Array.isArray(rota.geometry) && rota.geometry.length > 1
            ? rota.geometry
            : points;

        if (geometry.length > 1) {
            L.polyline(geometry, {
                color: '#9b1c1c',
                weight: 4,
                opacity: 0.85,
            }).addTo(layerRef.current);
            mapInstance.current.fitBounds(geometry, { padding: [36, 36] });
        } else if (points.length) {
            mapInstance.current.fitBounds(points, { padding: [36, 36] });
        }
    }, [rota]);

    const distanciaLabel = rota?.destino?.distancia_km != null
        ? `${Number(rota.destino.distancia_km).toLocaleString('pt-BR')} km`
        : null;
    const tempoLabel = formatDuracao(rota?.destino?.duracao_min);

    return (
        <section className="admin-frete-destino-map">
            <header className="admin-frete-destino-map-head">
                <div className="admin-frete-destino-map-title">
                    <i className="fas fa-route" aria-hidden="true" />
                    <div>
                        <h4>Rota até a cidade</h4>
                        <p>
                            {loading
                                ? 'Calculando trajeto pelas ruas...'
                                : distanciaLabel
                                    ? (
                                        <>
                                            Distância por estrada: <strong>{distanciaLabel}</strong>
                                            {tempoLabel ? (
                                                <>
                                                    {' · '}
                                                    <i className="fas fa-truck me-1" aria-hidden="true" />
                                                    Tempo de caminhão: <strong>{tempoLabel}</strong>
                                                </>
                                            ) : null}
                                        </>
                                    )
                                    : 'Informe o CEP para calcular a rota da cerâmica até a cidade.'}
                        </p>
                    </div>
                </div>
            </header>
            <div className="admin-frota-map admin-frete-destino-map-canvas" ref={mapRef} />
        </section>
    );
}
