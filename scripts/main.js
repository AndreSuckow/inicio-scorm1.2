const scorm = pipwerks.SCORM;
scorm.version = "1.2";

let isLMS = false;
let totalSections = 0;
let currentSectionIndex = 0;
let highestSectionVisited = 0;
let debugMode = false; // Variável de controle do modo debug

// Dados do SCORM para controle (agora usado em ambos os ambientes)
let data = {
  scoreRaw: "0",
  lessonLocation: "0",
  lessonStatus: "incomplete"
};

// Função para ativar/desativar modo debug
function toggleDebug(active = true) {
  debugMode = active;
  console.log(`%cModo Debug ${debugMode ? 'ATIVADO' : 'DESATIVADO'}`, 'color: green; font-weight: bold');
  if (debugMode) {
    console.log('%cUse debug.goTo(número_da_tela) para navegar', 'color: green');
  }
}

// Objeto debug com funções úteis para desenvolvimento
const debug = {
  goTo: function(screenNumber) {
    if (!debugMode) {
      console.log('%cAtive o modo debug primeiro usando toggleDebug()', 'color: red');
      return;
    }
    
    const index = screenNumber - 1; // Converte número da tela para índice (1 -> 0)
    if (index < 0 || index >= totalSections) {
      console.log(`%cTela ${screenNumber} não existe. Total de telas: ${totalSections}`, 'color: red');
      return;
    }
    
    console.log(`%cNavegando para tela ${screenNumber} via modo debug`, 'color: cyan');
    goToSection(index);
  },
  
  status: function() {
    console.log('%cStatus do Curso:', 'color: cyan; font-weight: bold');
    console.log('Total de telas:', totalSections);
    console.log('Tela atual:', currentSectionIndex + 1);
    console.log('Maior tela visitada:', highestSectionVisited + 1);
    console.log('Progresso:', data.scoreRaw + '%');
    console.log('Status:', data.lessonStatus);
    console.log('Modo Debug:', debugMode ? 'Ativado' : 'Desativado');
  }
};

// Função para atualizar o progresso
function updateProgress(index) {
  // Calcula progresso baseado no maior índice alcançado
  const perc = Math.round(((highestSectionVisited + 1) / totalSections) * 100);
  data.scoreRaw = perc.toString();
  data.lessonLocation = highestSectionVisited.toString();

  console.log(`%cProgresso atual do curso: ${perc}%`, 'color: orange; font-weight: bold');

  if (highestSectionVisited === totalSections - 1) {
    data.lessonStatus = "completed";
    console.log('%cCurso Completo!', 'color: green; font-weight: bold; font-size: 14px');
  }

  sincronizeSCORM();
}

// Função global para navegar entre seções
function goToSection(index) {
  if (index < 0 || index >= totalSections) return;

  document.querySelectorAll('.secao').forEach(section => {
    section.classList.remove('active');
  });

  document.querySelectorAll('.secao')[index].classList.add('active');
  
  currentSectionIndex = index;
  highestSectionVisited = Math.max(highestSectionVisited, currentSectionIndex);
  
  console.log(`%cNavegando para tela ${index + 1} de ${totalSections}`, 'color: purple; font-weight: bold');
  updateProgress(index);
}

// Salva dados no LMS ou localStorage
function sincronizeSCORM() {
  // Atualiza o checkpoint
  highestSectionVisited = Math.max(highestSectionVisited, currentSectionIndex);
  
  if (isLMS) {
    scorm.set("cmi.core.score.raw", data.scoreRaw);
    scorm.set("cmi.core.lesson_location", highestSectionVisited.toString());
    scorm.set("cmi.core.lesson_status", data.lessonStatus);
    scorm.save();
  } else {
    // Salva no localStorage quando não há LMS
    localStorage.setItem('courseProgress', JSON.stringify({
      data: data,
      highestSectionVisited: highestSectionVisited
    }));
  }
}

// Tenta recuperar dados salvos localmente se não estiver em ambiente LMS
if (localStorage.getItem('courseProgress')) {
  const savedProgress = JSON.parse(localStorage.getItem('courseProgress'));
  data = savedProgress.data;
  highestSectionVisited = savedProgress.highestSectionVisited;
}

// Inicia comunicação SCORM ou modo local
(function initCourse() {
  const connected = scorm.init();
  isLMS = !!connected;

  if (isLMS) {
    console.log('%cServidor LMS Encontrado.', 'color: green; font-weight: bold');
    
    const lastLocation = scorm.get("cmi.core.lesson_location");
    const lastStatus = scorm.get("cmi.core.lesson_status");
    const lastScore = scorm.get("cmi.core.score.raw");

    data.lessonLocation = lastLocation || "0";
    data.lessonStatus = lastStatus || "incomplete";
    data.scoreRaw = lastScore || "0";
    
    highestSectionVisited = Number(data.lessonLocation);

    scorm.set("cmi.core.score.min", "0");
    scorm.set("cmi.core.score.max", "100");
  } else {
    console.log('%cModo Local Ativo - Progresso salvo no navegador', 'color: blue; font-weight: bold');
  }

  // Configuração inicial (comum para ambos os modos)
  const sections = document.querySelectorAll(".secao");
  totalSections = sections.length;
  
  // Log da última tela visitada
  console.log(`%cÚltima tela visitada: ${Number(data.lessonLocation) + 1}`, 'color: blue; font-style: italic');
  
  // Inicia na última seção visitada
  if (Number(data.lessonLocation) > 0) {
    goToSection(Number(data.lessonLocation));
  }
})();

// Expondo a função globalmente para os botões
window.goToSection = goToSection;

// Expondo funções de debug globalmente
window.toggleDebug = toggleDebug;
window.debug = debug;

// Mensagem inicial sobre modo debug
console.log('%cModo debug disponível! Use toggleDebug() para ativar', 'color: green; font-style: italic');
