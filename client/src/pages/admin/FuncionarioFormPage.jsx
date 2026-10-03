import { useNavigate, useParams } from 'react-router-dom';
import FuncionarioModal from '../../components/admin/funcionarios/FuncionarioModal';

export default function FuncionarioFormPage() {
    const navigate = useNavigate();
    const { employeeId } = useParams();
    const parsedEmployeeId = employeeId && employeeId !== 'novo' ? employeeId : null;

    const handleClose = () => {
        navigate('/funcionarios');
    };

    return (
        <FuncionarioModal
            employeeId={parsedEmployeeId}
            onClose={handleClose}
            onSaved={handleClose}
        />
    );
}
