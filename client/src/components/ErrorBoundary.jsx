import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, message: '' };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, message: error?.message || 'Erro desconhecido' };
    }

    componentDidCatch(error, info) {
        console.error('Erro na landing page:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    background: '#f5f5f5',
                    fontFamily: 'Lato, sans-serif'
                }}
                >
                    <div style={{
                        maxWidth: '520px',
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '24px',
                        textAlign: 'center'
                    }}
                    >
                        <h1 style={{ color: '#9b1c1c', fontSize: '1.4rem', marginBottom: '12px' }}>
                            Não foi possível carregar a página
                        </h1>
                        <p style={{ color: '#444', marginBottom: '16px' }}>
                            Recarregue com Ctrl+F5. Se o problema continuar, reinicie o servidor com
                            {' '}
                            <code>npm run dev</code>.
                        </p>
                        <p style={{ color: '#777', fontSize: '0.85rem' }}>{this.state.message}</p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
