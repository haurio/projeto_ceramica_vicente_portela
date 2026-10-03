import { useNavigate, useParams } from 'react-router-dom';
import ProdutoModal from '../../components/admin/produtos/ProdutoModal';

export default function ProdutoFormPage() {
    const navigate = useNavigate();
    const { produtoId } = useParams();
    const parsedId = produtoId && produtoId !== 'novo' ? produtoId : null;

    const handleClose = () => {
        navigate('/produtos');
    };

    return (
        <ProdutoModal
            produtoId={parsedId}
            onClose={handleClose}
            onSaved={handleClose}
        />
    );
}
