import { useCallback, useState } from 'react';
import { onlyDigits } from '../utils/inputMasks';

export function useViaCep({ onAddressFound, onError } = {}) {
    const [loading, setLoading] = useState(false);

    const lookupCep = useCallback(async (cep) => {
        const digits = onlyDigits(cep);

        if (digits.length !== 8) {
            return false;
        }

        setLoading(true);

        try {
            const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);

            if (!response.ok) {
                throw new Error('Erro ao consultar CEP.');
            }

            const data = await response.json();

            if (data.erro) {
                onError?.('CEP inválido.');
                return false;
            }

            onAddressFound?.({
                city: data.localidade || '',
                state: data.uf || '',
                street: data.logradouro || '',
                neighborhood: data.bairro || '',
            });

            return true;
        } catch {
            onError?.('Erro ao consultar CEP.');
            return false;
        } finally {
            setLoading(false);
        }
    }, [onAddressFound, onError]);

    const handleCepBlur = useCallback(async (cep) => {
        await lookupCep(cep);
    }, [lookupCep]);

    return { handleCepBlur, lookupCep, loading };
}
