export default function AuthFooter() {
    return (
        <footer className="auth-footer">
            <div className="auth-footer-inner">
                <p>
                    © {new Date().getFullYear()}
                    <span className="auth-footer-sep" aria-hidden="true">-</span>
                    Todos os direitos reservados à Cerâmica Vicente Portela Ltda.
                    {' '}CNPJ: 09.207.910/0001-14
                </p>
                <span className="auth-footer-credit">Desenvolvido por Haurio Vieira</span>
            </div>
        </footer>
    );
}
