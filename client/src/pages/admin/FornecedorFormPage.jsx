import { useNavigate, useParams } from 'react-router-dom';
import FornecedorModal from '../../components/admin/fornecedores/FornecedorModal';

export default function FornecedorFormPage() {
    const navigate = useNavigate();
    const { fornecedorId } = useParams();
    const parsedId = fornecedorId && fornecedorId !== 'novo' ? fornecedorId : null;

    const handleClose = () => {
        navigate('/fornecedores');
    };

    return (
        <FornecedorModal
            fornecedorId={parsedId}
            onClose={handleClose}
            onSaved={handleClose}
        />
    );
}
