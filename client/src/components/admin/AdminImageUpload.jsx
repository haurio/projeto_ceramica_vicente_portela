import { useId, useRef, useState } from 'react';
import { uploadProdutoImagem } from '../../api/produtos';
import { showToast } from '../../utils/toast';

export default function AdminImageUpload({
    label = 'Imagem do Produto',
    value = '',
    onChange,
    onUploaded,
    disabled = false,
    variant = 'inline',
    multiple = false,
    onUpload = uploadProdutoImagem,
}) {
    const isSide = variant === 'side';
    const inputRef = useRef(null);
    const fieldId = useId();
    const [uploading, setUploading] = useState(false);

    const emitChange = (nextValue) => {
        onChange?.({
            target: {
                name: 'imagem_url',
                value: nextValue || '',
            },
        });
    };

    const validateFile = (file) => {
        if (!file.type?.startsWith('image/')) {
            showToast('error', 'Selecione uma imagem (JPG, PNG ou WEBP).');
            return false;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('error', 'A imagem deve ter no máximo 5 MB.');
            return false;
        }
        return true;
    };

    const handleFiles = async (fileList) => {
        const files = Array.from(fileList || []).filter(Boolean);
        if (!files.length || disabled || uploading) return;

        const accepted = files.filter(validateFile);
        if (!accepted.length) return;

        setUploading(true);

        try {
            const urls = [];
            for (const file of (multiple ? accepted : accepted.slice(0, 1))) {
                const data = await onUpload(file);
                const url = String(data?.imagem_url || '').trim();
                if (url) urls.push(url);
            }

            if (!urls.length) {
                throw new Error('Não foi possível obter a URL da imagem.');
            }

            if (multiple) {
                onUploaded?.(urls);
                emitChange('');
                showToast('success', urls.length > 1
                    ? `${urls.length} fotos enviadas com sucesso.`
                    : 'Foto enviada com sucesso.');
            } else {
                emitChange(urls[0]);
                onUploaded?.(urls);
                showToast('success', 'Imagem enviada com sucesso.');
            }
        } catch (error) {
            showToast('error', error.message || 'Erro ao enviar imagem.');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const openPicker = () => {
        if (disabled || uploading) return;
        inputRef.current?.click();
    };

    const clearImage = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (disabled || uploading) return;
        emitChange('');
    };

    const emptyLabel = multiple
        ? (uploading ? 'Enviando...' : 'Clique para adicionar uma ou mais fotos')
        : (uploading ? 'Enviando...' : 'Nenhuma imagem selecionada');

    return (
        <div className={`admin-field admin-image-field${isSide ? ' is-side' : ''}${disabled ? ' is-locked' : ''}${value ? ' has-image' : ''}${multiple ? ' is-multiple' : ''}`}>
            <div className={`admin-field-control admin-image-field-control${isSide ? ' is-side' : ''}`}>
                <input
                    ref={inputRef}
                    id={fieldId}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    className="admin-image-upload-input"
                    disabled={disabled || uploading}
                    multiple={multiple}
                    onChange={(event) => handleFiles(event.target.files)}
                />

                <div className="admin-image-field-content">
                    {value && !multiple ? (
                        <div className="admin-image-field-preview">
                            <img src={value} alt={label} className="admin-image-field-thumb" />
                            <button
                                type="button"
                                className="admin-image-field-btn is-remove"
                                onClick={clearImage}
                                disabled={disabled || uploading}
                                aria-label="Remover imagem"
                                title="Remover imagem"
                            >
                                <i className="fas fa-times" aria-hidden="true" />
                            </button>
                        </div>
                    ) : isSide ? (
                        <button
                            type="button"
                            className="admin-image-field-btn is-upload is-center"
                            onClick={openPicker}
                            disabled={disabled || uploading}
                            aria-label="Enviar imagem"
                            title="Enviar imagem"
                        >
                            <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`} aria-hidden="true" />
                            <span>{uploading ? 'Enviando...' : 'Enviar'}</span>
                        </button>
                    ) : (
                        <>
                            <div className="admin-image-field-empty">
                                <i className="fas fa-image" aria-hidden="true" />
                                <span>{emptyLabel}</span>
                            </div>
                            <div className="admin-image-field-actions">
                                <button
                                    type="button"
                                    className="admin-image-field-btn is-upload"
                                    onClick={openPicker}
                                    disabled={disabled || uploading}
                                    aria-label={multiple ? 'Adicionar fotos' : 'Enviar imagem'}
                                    title={multiple ? 'Adicionar fotos' : 'Enviar imagem'}
                                >
                                    <i className={`fas ${uploading ? 'fa-spinner fa-spin' : (multiple ? 'fa-plus' : 'fa-cloud-upload-alt')}`} aria-hidden="true" />
                                </button>
                            </div>
                        </>
                    )}

                    {!isSide && value && !multiple ? (
                        <div className="admin-image-field-actions">
                            <button
                                type="button"
                                className="admin-image-field-btn is-upload"
                                onClick={openPicker}
                                disabled={disabled || uploading}
                                aria-label="Trocar imagem"
                                title="Trocar imagem"
                            >
                                <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`} aria-hidden="true" />
                            </button>
                        </div>
                    ) : null}
                </div>

                <label htmlFor={fieldId} className="admin-field-label">
                    {label}
                </label>
            </div>
        </div>
    );
}
