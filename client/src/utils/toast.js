import { toast, Bounce } from 'react-toastify';

const toastByType = {
    success: toast.success,
    error: toast.error,
    warning: toast.warn,
    info: toast.info,
};

export const REQUIRED_FIELDS_MESSAGE = 'Preencha os campos obrigatórios.';

export function showRequiredFieldsToast() {
    showToast('error', REQUIRED_FIELDS_MESSAGE);
}

export function showToast(type, message, optionsOrTitle = {}) {
    const notify = toastByType[type] || toast.info;
    // Aceita título legado (3º arg string) sem quebrar o toast
    const options = typeof optionsOrTitle === 'string' ? {} : (optionsOrTitle || {});

    notify(String(message || ''), {
        position: 'top-right',
        autoClose: 1800,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'colored',
        transition: Bounce,
        ...options,
    });
}

export { toast };
