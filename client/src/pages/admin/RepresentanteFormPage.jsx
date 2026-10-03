import { useNavigate, useParams } from 'react-router-dom';
import RepresentanteModal from '../../components/admin/representantes/RepresentanteModal';

export default function RepresentanteFormPage() {
    const navigate = useNavigate();
    const { representanteId } = useParams();
    const parsedId = representanteId && representanteId !== 'novo' ? representanteId : null;

    const handleClose = () => {
        navigate('/representantes');
    };

    return (
        <RepresentanteModal
            representanteId={parsedId}
            onClose={handleClose}
            onSaved={handleClose}
        />
    );
}
