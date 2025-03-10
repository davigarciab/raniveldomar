// Versão simplificada da classe ARVisualization
class ARVisualization {
  constructor() {
    this.seaLevel = 0.5;
  }
  
  async initialize() {
    console.log('AR inicializado');
    return Promise.resolve();
  }
  
  updateSeaLevel(level) {
    this.seaLevel = level;
    // Atualiza a visualização global
    if (window.app) {
      window.app.seaLevelRise = level;
    }
  }
}

class App {
  constructor() {
    this.ar = new ARVisualization();
    this.scenarioSelect = document.getElementById('scenario-select');
    this.infoButton = document.getElementById('info-button');
    this.infoPanel = document.getElementById('info-panel');
    this.closeInfoButton = document.getElementById('close-info');
    
    this.videoElement = document.getElementById('camera-feed');
    this.canvasElement = document.getElementById('arCanvas');
    this.statusElement = document.getElementById('status');
    this.canvasContext = this.canvasElement ? this.canvasElement.getContext('2d') : null;
    this.seaLevelRise = 0.5;
    
    // Tornar a instância acessível globalmente para atualizações
    window.app = this;
    
    this.initializeApp();
  }

  async initializeApp() {
    await this.ar.initialize();
    this.setupEventListeners();
    this.checkLocation();
    this.startCamera();
  }

  setupEventListeners() {
    this.scenarioSelect.addEventListener('change', (e) => {
      this.ar.updateSeaLevel(parseFloat(e.target.value));
      this.updateScenarioInfo(e.target.value);
    });

    this.infoButton.addEventListener('click', () => {
      this.infoPanel.classList.remove('hidden');
    });

    this.closeInfoButton.addEventListener('click', () => {
      this.infoPanel.classList.add('hidden');
    });
  }

  async checkLocation() {
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        // Coordenadas aproximadas de Beberibe
        const beberibeLatitude = -4.1847;
        const beberibeLongitude = -38.1307;
        
        // Verifica se está dentro de um raio de ~10km de Beberibe
        const distance = this.calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          beberibeLatitude,
          beberibeLongitude
        );

        if (distance > 10) {
          alert('Você está fora da área de Beberibe. O aplicativo funcionará em modo de demonstração.');
        }
      } catch (error) {
        console.error('Erro ao obter localização:', error);
      }
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Cálculo da distância em km usando a fórmula de Haversine
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  updateScenarioInfo(level) {
    const scenarioInfo = document.getElementById('scenario-info');
    const info = {
      '0.5': 'Aumento de 0,5m: Impacto moderado na linha costeira, possível erosão das praias.',
      '1.0': 'Aumento de 1,0m: Inundação significativa das áreas baixas, risco para estruturas costeiras.',
      '2.0': 'Aumento de 2,0m: Impacto severo, grandes áreas costeiras submersas, necessidade de relocação.'
    };
    
    scenarioInfo.textContent = info[level] || '';
  }

  updateStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
    console.log(message);
  }

  startCamera() {
    this.updateStatus('Solicitando acesso à câmera...');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.updateStatus('Seu navegador não suporta acesso à câmera');
      return;
    }

    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    })
    .then(stream => {
      this.updateStatus('Câmera conectada!');
      
      if (!this.videoElement) {
        throw new Error('Elemento de vídeo não encontrado');
      }
      
      this.videoElement.srcObject = stream;
      
      this.videoElement.onerror = (e) => {
        this.updateStatus(`Erro ao carregar vídeo: ${e}`);
      };
      
      this.videoElement.onloadedmetadata = () => {
        this.videoElement.play()
          .then(() => {
            if (this.canvasElement && this.videoElement) {
              this.canvasElement.width = this.videoElement.videoWidth;
              this.canvasElement.height = this.videoElement.videoHeight;
              this.drawAR();
              this.updateStatus('AR ativo');
            }
          })
          .catch(error => {
            this.updateStatus(`Erro ao iniciar reprodução: ${error.message}`);
            console.error('Erro ao reproduzir vídeo:', error);
          });
      };
    })
    .catch(error => {
      console.error("Erro detalhado ao acessar a câmera:", error.name, error.message);
      this.updateStatus(`Erro ao acessar a câmera: ${error.message}`);
    });
  }

  drawAR() {
    if (this.videoElement && this.canvasContext && 
        this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      
      // Limpa o canvas
      this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

      // Calcula a posição da linha do mar
      const seaLevelY = this.canvasElement.height * 0.6 - this.seaLevelRise * 50;

      // Desenha a linha do mar
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(0, seaLevelY);
      this.canvasContext.lineTo(this.canvasElement.width, seaLevelY);
      this.canvasContext.strokeStyle = 'rgba(0, 100, 255, 0.8)';
      this.canvasContext.lineWidth = 3;
      this.canvasContext.stroke();

      // Área submersa
      this.canvasContext.fillStyle = 'rgba(0, 100, 255, 0.2)';
      this.canvasContext.fillRect(0, seaLevelY, this.canvasElement.width, this.canvasElement.height - seaLevelY);
    }

    // Continuar a animação
    requestAnimationFrame(() => this.drawAR());
  }
}

// Iniciar o aplicativo quando a página estiver carregada
document.addEventListener('DOMContentLoaded', () => {
  new App();
});