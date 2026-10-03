import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FeriasModal from '../../components/admin/ferias/FeriasModal';

export default function FeriasFormPage() {
    const navigate = useNavigate();
    const { feriasId } = useParams();
    const [searchParams] = useSearchParams();
    const parsedId = feriasId && feriasId !== 'novo' ? feriasId : null;

    const handleClose = () => {
        navigate('/ferias');
    };

    return (
        <FeriasModal
            feriasId={parsedId}
            initialFuncionarioId={searchParams.get('funcionario_id') || ''}
            initialPeriodo={searchParams.get('periodo') || ''}
            onClose={handleClose}
            onSaved={handleClose}
        />
    );
}
