class TimerManager {
    constructor() {
        this.timers = [];
        this.nextId = 1;
        this.settings = {
            soundEnabled: true,
            notificationsEnabled: false,
            theme: 'auto'
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.updateTheme();
        this.requestNotificationPermission();
    }

    bindEvents() {
        // Botones principales
        document.getElementById('addTimer').addEventListener('click', () => this.showModal('timer'));
        document.getElementById('addCountdown').addEventListener('click', () => this.showModal('countdown'));
        document.getElementById('settingsBtn').addEventListener('click', () => this.toggleSettings());
        
        // Modal
        document.getElementById('closeModal').addEventListener('click', () => this.hideModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('createBtn').addEventListener('click', () => this.createTimer());
        
        // Configuración
        document.getElementById('soundEnabled').addEventListener('change', (e) => this.updateSetting('soundEnabled', e.target.checked));
        document.getElementById('notificationsEnabled').addEventListener('change', (e) => this.updateSetting('notificationsEnabled', e.target.checked));
        document.getElementById('theme').addEventListener('change', (e) => this.updateSetting('theme', e.target.value));
        
        // Notificación de alerta
        document.getElementById('closeAlert').addEventListener('click', () => this.hideAlert());
        
        // Cerrar modal al hacer clic fuera
        document.getElementById('timerModal').addEventListener('click', (e) => {
            if (e.target.id === 'timerModal') {
                this.hideModal();
            }
        });
    }

    showModal(type) {
        const modal = document.getElementById('timerModal');
        const modalTitle = document.getElementById('modalTitle');
        const countdownGroup = document.getElementById('countdownGroup');
        
        modalTitle.textContent = type === 'timer' ? 'Nuevo Cronómetro' : 'Nueva Cuenta Regresiva';
        countdownGroup.style.display = type === 'countdown' ? 'block' : 'none';
        
        // Limpiar formulario
        document.getElementById('timerName').value = '';
        document.getElementById('hours').value = '';
        document.getElementById('minutes').value = '';
        document.getElementById('seconds').value = '';
        
        modal.classList.add('show');
        document.getElementById('timerName').focus();
    }

    hideModal() {
        document.getElementById('timerModal').classList.remove('show');
    }

    createTimer() {
        const name = document.getElementById('timerName').value.trim();
        const type = document.getElementById('countdownGroup').style.display === 'none' ? 'timer' : 'countdown';
        const color = document.querySelector('input[name="color"]:checked').value;
        
        // Generar nombre automático si no se proporciona uno
        let timerName = name;
        if (!timerName) {
            const timerCount = this.timers.filter(t => t.type === type).length + 1;
            timerName = type === 'timer' ? `Cronómetro ${timerCount}` : `Temporizador ${timerCount}`;
        }

        let targetTime = 0;
        if (type === 'countdown') {
            const hours = parseInt(document.getElementById('hours').value) || 0;
            const minutes = parseInt(document.getElementById('minutes').value) || 0;
            const seconds = parseInt(document.getElementById('seconds').value) || 0;
            
            targetTime = hours * 3600 + minutes * 60 + seconds;
            
            if (targetTime === 0) {
                alert('Por favor ingresa un tiempo válido para la cuenta regresiva');
                return;
            }
        }

        const timer = {
            id: this.nextId++,
            name: timerName,
            type: type,
            color: color,
            targetTime: targetTime,
            currentTime: type === 'timer' ? 0 : targetTime,
            isRunning: false,
            isPaused: false,
            startTime: null,
            pausedTime: 0
        };

        this.timers.push(timer);
        this.renderTimer(timer);
        this.hideModal();
        this.updateEmptyState();
    }

    renderTimer(timer) {
        const container = document.getElementById('timersContainer');
        const timerElement = document.createElement('div');
        timerElement.className = `timer-card ${timer.color}`;
        timerElement.id = `timer-${timer.id}`;
        
        timerElement.innerHTML = `
            <div class="timer-header">
                <div class="timer-name">${timer.name}</div>
                <div class="timer-type ${timer.type}">${timer.type === 'timer' ? 'Cronómetro' : 'Cuenta Regresiva'}</div>
            </div>
            <div class="timer-display">
                <div class="timer-time" id="time-${timer.id}">${this.formatTime(timer.currentTime)}</div>
                <div class="timer-progress">
                    <div class="timer-progress-bar ${timer.type}" id="progress-${timer.id}" style="width: ${this.getProgressPercentage(timer)}%"></div>
                </div>
            </div>
            <div class="timer-controls">
                <button class="btn btn-success" onclick="timerManager.startTimer(${timer.id})" id="start-${timer.id}">
                    <i class="fas fa-play"></i> Iniciar
                </button>
                <button class="btn btn-warning" onclick="timerManager.pauseTimer(${timer.id})" id="pause-${timer.id}" style="display: none;">
                    <i class="fas fa-pause"></i> Pausar
                </button>
                <button class="btn btn-outline" onclick="timerManager.resetTimer(${timer.id})" id="reset-${timer.id}">
                    <i class="fas fa-redo"></i> Reiniciar
                </button>
                <button class="btn btn-danger" onclick="timerManager.deleteTimer(${timer.id})" id="delete-${timer.id}">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;
        
        container.appendChild(timerElement);
    }

    startTimer(id) {
        const timer = this.timers.find(t => t.id === id);
        if (!timer) return;

        if (!timer.isRunning) {
            timer.isRunning = true;
            timer.isPaused = false;
            timer.startTime = Date.now() - timer.pausedTime;
            
            this.updateTimerButtons(timer);
            this.startTimerInterval(timer);
        }
    }

    pauseTimer(id) {
        const timer = this.timers.find(t => t.id === id);
        if (!timer || !timer.isRunning) return;

        timer.isRunning = false;
        timer.isPaused = true;
        timer.pausedTime = Date.now() - timer.startTime;
        
        this.updateTimerButtons(timer);
        this.stopTimerInterval(timer);
    }

    resetTimer(id) {
        const timer = this.timers.find(t => t.id === id);
        if (!timer) return;

        timer.isRunning = false;
        timer.isPaused = false;
        timer.isAlerting = false;
        timer.isSilenced = false;
        timer.currentTime = timer.type === 'timer' ? 0 : timer.targetTime;
        timer.startTime = null;
        timer.pausedTime = 0;
        
        // Limpiar intervalo de sonido
        if (timer.soundInterval) {
            clearInterval(timer.soundInterval);
        }
        
        this.updateTimerButtons(timer);
        this.stopTimerInterval(timer);
        this.updateTimerDisplay(timer);
        
        // Remover alerta visual si existe
        const timerElement = document.getElementById(`timer-${id}`);
        if (timerElement) {
            timerElement.classList.remove('alert');
        }
    }

    deleteTimer(id) {
        if (confirm('¿Estás seguro de que quieres eliminar este cronómetro?')) {
            const timerIndex = this.timers.findIndex(t => t.id === id);
            if (timerIndex !== -1) {
                const timer = this.timers[timerIndex];
                
                // Limpiar intervalo de sonido
                if (timer.soundInterval) {
                    clearInterval(timer.soundInterval);
                }
                
                this.stopTimerInterval(timer);
                this.timers.splice(timerIndex, 1);
                
                const timerElement = document.getElementById(`timer-${id}`);
                if (timerElement) {
                    timerElement.remove();
                }
                
                this.updateEmptyState();
            }
        }
    }

    startTimerInterval(timer) {
        timer.intervalId = setInterval(() => {
            if (timer.type === 'timer') {
                timer.currentTime = (Date.now() - timer.startTime) / 1000;
            } else {
                const elapsed = (Date.now() - timer.startTime) / 1000;
                timer.currentTime = Math.max(0, timer.targetTime - elapsed);
                
                if (timer.currentTime <= 0) {
                    this.timerCompleted(timer);
                }
            }
            
            this.updateTimerDisplay(timer);
        }, 10); // Actualizar cada 10ms para mostrar milisegundos
    }

    stopTimerInterval(timer) {
        if (timer.intervalId) {
            clearInterval(timer.intervalId);
            timer.intervalId = null;
        }
    }

    updateTimerDisplay(timer) {
        const timeElement = document.getElementById(`time-${timer.id}`);
        const progressElement = document.getElementById(`progress-${timer.id}`);
        
        if (timeElement) {
            timeElement.innerHTML = this.formatTime(timer.currentTime);
        }
        
        if (progressElement) {
            progressElement.style.width = `${this.getProgressPercentage(timer)}%`;
        }
    }

    updateTimerButtons(timer) {
        const startBtn = document.getElementById(`start-${timer.id}`);
        const pauseBtn = document.getElementById(`pause-${timer.id}`);
        
        if (timer.isAlerting && !timer.isSilenced) {
            // Si está en alerta, mostrar botón de silenciar
            startBtn.innerHTML = '<i class="fas fa-volume-mute"></i> Silenciar';
            startBtn.className = 'btn btn-warning';
            startBtn.onclick = () => this.silenceTimer(timer.id);
            startBtn.style.display = 'inline-flex';
            pauseBtn.style.display = 'none';
        } else if (timer.isRunning) {
            startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar';
            startBtn.className = 'btn btn-success';
            startBtn.onclick = () => this.startTimer(timer.id);
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-flex';
        } else {
            startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar';
            startBtn.className = 'btn btn-success';
            startBtn.onclick = () => this.startTimer(timer.id);
            startBtn.style.display = 'inline-flex';
            pauseBtn.style.display = 'none';
        }
    }

    getProgressPercentage(timer) {
        if (timer.type === 'timer') {
            // Para cronómetros, mostrar progreso basado en tiempo transcurrido
            const maxTime = 3600; // 1 hora máximo para visualización
            return Math.min((timer.currentTime / maxTime) * 100, 100);
        } else {
            // Para cuentas regresivas, mostrar progreso basado en tiempo restante
            return ((timer.targetTime - timer.currentTime) / timer.targetTime) * 100;
        }
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        
        const msString = `<span class="milliseconds">.${milliseconds.toString().padStart(3, '0')}</span>`;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}${msString}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}${msString}`;
        }
    }

    timerCompleted(timer) {
        this.stopTimerInterval(timer);
        timer.isRunning = false;
        timer.isPaused = false;
        timer.isAlerting = true; // Marcar que está en estado de alerta
        
        // Agregar clase de alerta visual
        const timerElement = document.getElementById(`timer-${timer.id}`);
        if (timerElement) {
            timerElement.classList.add('alert');
        }
        
        // Mostrar notificación con botón de silenciar
        this.showAlert(timer.name, timer.id);
        
        // Reproducir sonido continuo
        if (this.settings.soundEnabled) {
            this.startContinuousSound(timer);
        }
        
        // Notificación del navegador
        if (this.settings.notificationsEnabled) {
            this.showNotification(timer.name);
        }
        
        // Actualizar botones para incluir silenciar
        this.updateTimerButtons(timer);
    }

    showAlert(timerName, timerId) {
        const alert = document.getElementById('alertNotification');
        const message = document.getElementById('alertMessage');
        
        message.innerHTML = `
            <div>
                <strong>"${timerName}"</strong> ha completado su tiempo
                <button class="btn btn-outline btn-sm" onclick="timerManager.silenceTimer(${timerId})" style="margin-left: 10px;">
                    <i class="fas fa-volume-mute"></i> Silenciar
                </button>
            </div>
        `;
        alert.classList.add('show');
        
        // No auto-ocultar, solo cuando el usuario silencie
    }

    hideAlert() {
        document.getElementById('alertNotification').classList.remove('show');
    }

    startContinuousSound(timer) {
        // Repetir el sonido de alerta cada 2 segundos hasta que se silencie
        timer.soundInterval = setInterval(() => {
            if (timer.isAlerting && !timer.isSilenced) {
                this.playAlertSound();
            }
        }, 2000);
    }

    silenceTimer(timerId) {
        const timer = this.timers.find(t => t.id === timerId);
        if (!timer) return;

        timer.isSilenced = true;
        timer.isAlerting = false;
        
        // Detener el intervalo de repetición del sonido
        if (timer.soundInterval) {
            clearInterval(timer.soundInterval);
        }
        
        // Remover alerta visual
        const timerElement = document.getElementById(`timer-${timer.id}`);
        if (timerElement) {
            timerElement.classList.remove('alert');
        }
        
        // Ocultar notificación
        this.hideAlert();
        
        // Actualizar botones
        this.updateTimerButtons(timer);
    }

    playAlertSound() {
        // Crear un sonido de alerta más constante y rápido usando Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Configurar el oscilador
        oscillator.type = 'square'; // Sonido más constante y llamativo
        
        // Crear un patrón rítmico rápido y constante
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.5);
        
        // Configurar el volumen constante
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.6);
    }

    showNotification(timerName) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('¡Tiempo completado!', {
                body: `"${timerName}" ha terminado`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233b82f6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
                tag: 'timer-alert'
            });
        }
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.classList.toggle('show');
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        
        if (key === 'theme') {
            this.updateTheme();
        }
    }

    updateTheme() {
        const theme = this.settings.theme;
        document.documentElement.setAttribute('data-theme', theme);
    }

    loadSettings() {
        const saved = localStorage.getItem('timerSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Aplicar configuración a la UI
        document.getElementById('soundEnabled').checked = this.settings.soundEnabled;
        document.getElementById('notificationsEnabled').checked = this.settings.notificationsEnabled;
        document.getElementById('theme').value = this.settings.theme;
    }

    saveSettings() {
        localStorage.setItem('timerSettings', JSON.stringify(this.settings));
    }

    updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const timersContainer = document.getElementById('timersContainer');
        
        if (this.timers.length === 0) {
            emptyState.style.display = 'block';
            timersContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            timersContainer.style.display = 'grid';
        }
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.timerManager = new TimerManager();
});

// Manejar cambios de visibilidad de la página para pausar timers cuando no están visibles
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // La página no está visible, pausar todos los timers
        timerManager.timers.forEach(timer => {
            if (timer.isRunning) {
                timerManager.pauseTimer(timer.id);
            }
        });
    }
});
