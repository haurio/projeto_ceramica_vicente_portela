const MAP_EMBED_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d10520.41789121759!2d-42.049247211110796!3d-19.191308724412636!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb05b48c0519bb3%3A0xdf71ef2a3b9e466d!2sCer%C3%A2mica%20Vicente%20Portela%20LTDA!5e1!3m2!1spt-PT!2spt!4v1755268322112!5m2!1spt-PT!2spt';

export default function MapModal() {
    return (
        <div className="modal fade map-modal" id="mapModal" tabIndex="-1" aria-labelledby="mapModalLabel" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg map-modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="mapModalLabel">
                            <i className="fas fa-map-marker-alt" aria-hidden="true" />
                            Localização
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fechar" />
                    </div>
                    <div className="modal-body">
                        <figure className="map-modal-aerial">
                            <img
                                src="/image/Inicio/aerea.jpg"
                                alt="Vista aérea da Cerâmica Vicente Portela em Engenheiro Caldas, às margens da Rodovia Santos Dumont e do Rio Doce"
                            />
                            <figcaption>Vista aérea — Engenheiro Caldas, MG</figcaption>
                        </figure>
                        <iframe
                            title="Localização Cerâmica Vicente Portela"
                            src={MAP_EMBED_URL}
                            width="100%"
                            height="420"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
