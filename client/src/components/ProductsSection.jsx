import { PRODUCTS } from '../data/landingData';

export default function ProductsSection({ onProductClick }) {
    return (
        <section className="products-section products-modern" id="produtos">
            <div className="container">
                <div className="section-head scroll-reveal">
                    <span className="section-eyebrow">Linha completa</span>
                    <h2 className="section-title">Nossos Produtos</h2>
                    <p className="section-lead">
                        Tijolos, blocos e lajotas para obras residenciais, comerciais e industriais.
                        Clique no produto para ver medidas e calcular a quantidade da sua obra.
                    </p>
                </div>

                <div className="products-modern-grid">
                    {PRODUCTS.map((product, index) => (
                        <article
                            key={product.name}
                            className="product-card scroll-reveal"
                            style={{ transitionDelay: `${index * 80}ms` }}
                            onClick={() => onProductClick(product)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onProductClick(product);
                                }
                            }}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="product-card-image-wrap">
                                <img src={product.image} alt={product.alt} className="product-card-image" />
                            </div>
                            <div className="product-card-body">
                                <h3 className="product-card-name">{product.name}</h3>
                                <span className="product-card-action">
                                    Ver detalhes
                                    <i className="fas fa-arrow-right" aria-hidden="true" />
                                </span>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
