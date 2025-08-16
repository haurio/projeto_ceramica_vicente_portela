document.addEventListener('DOMContentLoaded', function () {
    // Configuração inicial do toastr com depuração
    if (typeof toastr !== 'undefined') {
        toastr.options = {
            positionClass: 'toast-top-right',
            timeOut: 5000,
            closeButton: true
        };
        console.log('toastr inicializado com sucesso');
    } else {
        console.warn('toastr não está definido. Notificações serão exibidas no console e como alert.');
    }

    // Rolagem suave para todas as seções do menu com espaço extra
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            const target = document.querySelector(href);
            if (target) {
                let offset = 0;
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const extraPadding = 30; // Espaço adicional em pixels entre a navbar e a seção

                if (href === '#home') {
                    const button = document.querySelector('#home .call-to-action .btn.slider-btn');
                    if (button) {
                        const buttonTop = button.getBoundingClientRect().top + window.scrollY;
                        offset = buttonTop - navbarHeight - extraPadding;
                    }
                } else if (href === '#produtos' || href === '#historia' || href === '#duvidas' || href === '#atendimento') {
                    const title = target.querySelector('.section-title');
                    if (title) {
                        offset = title.getBoundingClientRect().top + window.scrollY - navbarHeight - extraPadding;
                    }
                } else if (href === '#empresa') {
                    const title = target.querySelector('h3');
                    if (title) {
                        offset = title.getBoundingClientRect().top + window.scrollY - navbarHeight - extraPadding;
                    }
                } else if (href === '#contato') {
                    const title = target.querySelector('.contact-title');
                    if (title) {
                        offset = title.getBoundingClientRect().top + window.scrollY - navbarHeight - extraPadding;
                    }
                } else {
                    offset = target.getBoundingClientRect().top + window.scrollY - navbarHeight - extraPadding;
                }

                if (offset < 0) offset = 0;

                window.scrollTo({
                    top: offset,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Inicializa o Swiper
    var swiper = new Swiper('.swiper-container', {
        effect: 'fade',
        fadeEffect: { crossFade: true },
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        autoplay: { delay: 5000, disableOnInteraction: false },
        loop: true,
    });

    // Adiciona blocos à camada de transição
    const transitionLayer = document.querySelector('.transition-layer');
    if (transitionLayer) {
        const rows = 8;
        const cols = 12;
        for (let i = 0; i < rows * cols; i++) {
            const block = document.createElement('div');
            block.className = 'block';
            const row = Math.floor(i / cols) + 1;
            const col = (i % cols) + 1;
            block.style.gridArea = `${row} / ${col} / span 1 / span 1`;
            const delay = (row * 0.05 + col * 0.03);
            block.style.animationDelay = `${delay}s`;
            transitionLayer.appendChild(block);
        }
    }

    // Controla a barra de progresso
    const progressBar = document.querySelector('.progress-bar');
    let progressInterval;

    function startProgress() {
        let progress = 0;
        if (!progressBar) return;
        progressBar.style.width = '0%';
        clearInterval(progressInterval);
        progressInterval = setInterval(() => {
            progress += (100 / (5000 / 50));
            progressBar.style.width = `${progress}%`;
            if (progress >= 100) {
                clearInterval(progressInterval);
            }
        }, 50);
    }

    function resetProgress() {
        clearInterval(progressInterval);
        if (progressBar) {
            progressBar.style.width = '0%';
        }
    }

    function triggerTransition() {
        if (transitionLayer) {
            transitionLayer.classList.remove('active');
            setTimeout(() => {
                transitionLayer.classList.add('active');
                setTimeout(() => {
                    transitionLayer.classList.remove('active');
                }, 700);
            }, 50);
        }
    }

    function alignButtonWithSlide() {
        var activeSlide = swiper.slides[swiper.activeIndex];
        var slideRect = activeSlide.getBoundingClientRect();
        var windowWidth = window.innerWidth;
        var slideCenter = slideRect.left + slideRect.width / 2;
        var button = document.querySelector('.call-to-action .btn.slider-btn');
        if (button) {
            var buttonWidth = button.offsetWidth;
            var newMarginLeft = slideCenter - windowWidth / 2;
            var maxMargin = windowWidth / 2 - buttonWidth / 2 - 20;
            if (newMarginLeft > maxMargin) newMarginLeft = maxMargin;
            if (newMarginLeft < -maxMargin) newMarginLeft = -maxMargin;
            button.style.marginLeft = newMarginLeft + 'px';
        }
    }

    swiper.on('slideChangeTransitionStart', function () {
        resetProgress();
        triggerTransition();
        setTimeout(startProgress, 50);
        alignButtonWithSlide();
    });

    swiper.on('autoplayStop', resetProgress);
    swiper.on('autoplayStart', startProgress);

    startProgress();
    alignButtonWithSlide();

    window.addEventListener('resize', function () {
        alignButtonWithSlide();
    });

    // Atualiza o ano no footer
    document.getElementById("anoAtual").textContent = new Date().getFullYear();

    // Configuração do envio do formulário
    const form = document.querySelector('.atendimento-section form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData(form);

            fetch(form.action, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                console.log('Status da resposta:', response.status, response.statusText); // Depuração
                if (response.status >= 200 && response.status < 300) { // Sucesso HTTP (200-299)
                    return response.text();
                } else {
                    throw new Error('Erro na requisição: ' + response.statusText);
                }
            })
            .then(data => {
                console.log('Resposta do servidor:', data); // Depuração
                const form = document.querySelector('.atendimento-section form');
                if (form) {
                    form.reset(); // Limpar os campos primeiro
                    if (typeof toastr !== 'undefined') {
                        try {
                            toastr.success('Mensagem enviada com sucesso!', 'Sucesso');
                        } catch (toastrError) {
                            console.error('Erro ao exibir toastr:', toastrError);
                            alert('Mensagem enviada com sucesso!'); // Fallback
                        }
                    } else {
                        console.log('Mensagem enviada com sucesso! (toastr não disponível)');
                        alert('Mensagem enviada com sucesso!'); // Fallback
                    }
                }
            })
            .catch(error => {
                console.error('Erro no envio:', error); // Depuração
                if (typeof toastr !== 'undefined') {
                    try {
                        toastr.error('Erro ao enviar a mensagem: ' + error.message, 'Erro');
                    } catch (toastrError) {
                        console.error('Erro ao exibir toastr:', toastrError);
                        alert('Erro ao enviar a mensagem: ' + error.message); // Fallback
                    }
                } else {
                    console.error('Erro (toastr não disponível):', error);
                    alert('Erro ao enviar a mensagem: ' + error.message); // Fallback
                }
            });
        });
    }
});