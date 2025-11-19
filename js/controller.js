// Global canvas variables
let canvas = null;
let context = null;

// Variables used when moving draggable BPMN boxes
let draggingBox = null;
let offsetX = 0;
let offsetY = 0;
let currentSelectedBox = null;

// Variables used when drawing connections between nodes
let connecting = false;          
let startNode = null;            
let tempLineEnd = { x: 0, y: 0 };
let connectorCounter = 1;

// Tracks menu cell usage
let menuCells = [];

// Storage for transitions and test results
let currentUserSolution = [];
let testResults = [];

// Quiz variables
let quizData = null;
let quizIndex = 0;
let quizScore = 0;
let currentQuizType = null;

// Shows one quiz question
function showQuizQuestion() {
  const qObj = quizData[quizIndex];
  const title = currentQuizType === "preQuiz" ? "Pre-Quiz" : "Post-Quiz";

  showQuizUI(
    title,
    qObj,
    quizIndex,
    quizData.length,
    (selected) => {
      if (selected === qObj.c) quizScore++;
      quizIndex++;
      if (quizIndex < quizData.length) showQuizQuestion();
      else finishQuiz();
    }
  );
}

// Initializes the canvas and loads first scenario
async function initCanvas() {
  const scenarioData = await loadScenarioJSON('scenarioData/scenario.json');
  model.loadedScenarioData = scenarioData;

  canvas = document.getElementById('BPMNcanvas');
  context = canvas.getContext('2d');
  context.canvas.width = model.canvasProperties.width;
  context.canvas.height = model.canvasProperties.height + 100;

  context.fillStyle = model.canvasProperties.backgroundColor;
  context.fillRect(0, 0, model.canvasProperties.width, model.canvasProperties.height);

  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete') resetConnections();
  });

  loadGameData();
  loadScenarioInformation();
  loadScenarioData();
  draw();
}

// Loads module metadata
function loadGameData() {
  const data = model.loadedScenarioData.aboutCampaign;
  model.game.numberOfScenarios = data.numberOfScenarios;
  model.game.moduleTitle = data.moduleTitle;
  model.game.moduleDescription = data.moduleDescription;
  model.game.endScreenText = data.endScreenText;
}

// Updates scenario header text
function loadScenarioInformation() {
  document.getElementById('moduleTitleHeader').innerText = model.game.moduleTitle;
  document.getElementById('moduleTextHeader').innerText = model.game.moduleDescription;

  const sc = model.loadedScenarioData.scenarios[model.game.currentScenario];
  document.getElementById('taskText').innerText = sc.scenarioTitle + "\n" + sc.scenarioDescription;
}

// Loads all BPMN objects for a scenario
function loadScenarioData() {
  const scenario = model.loadedScenarioData.scenarios[model.game.currentScenario];

  model.currentScenario.pools = loadStaticElements(scenario.static.pools);
  model.currentScenario.lanes = loadStaticElements(scenario.static.lanes);
  model.currentScenario.tokens = scenario.tokens;

  if (scenario.resetCanvas) {
    menuCells = [];
    model.currentScenario.nodes = processNodes(scenario.nodes);
    model.currentScenario.failureDescriptions = scenario.failureDescriptions || {};
    model.currentScenario.connectors = [];
  } else {
    model.currentScenario.nodes = [
      ...model.currentScenario.nodes,
      ...processNodes(scenario.nodes)
    ];
    model.currentScenario.failureDescriptions = {
      ...model.currentScenario.failureDescriptions,
      ...scenario.failureDescriptions
    };
  }

  let endEvent = model.currentScenario.nodes.find(n => n.type === "endEvent");

  if (!endEvent) {
    const tempEndEvent = [{
      type: "endEvent",
      name: "End",
      nodeId: "node_end",
      functions: []
    }];
    const [processedEnd] = processNodes(tempEndEvent);
    model.currentScenario.nodes.push(processedEnd);
    endEvent = processedEnd;
  }

  endEvent.functions = [
    ...(endEvent.functions || []),
    ...(scenario.endEventChecks || [])
  ];
}

// Converts pools/lanes into scaled canvas positions
function loadStaticElements(elements) {
  return elements.map(el => ({
    ...el,
    coordinates: {
      x: scaleCoordinate(el.coordinates.x, 'x'),
      y: scaleCoordinate(el.coordinates.y, 'y')
    },
    size: {
      width: scaleCoordinate(el.size.width, 'width'),
      height: scaleCoordinate(el.size.height, 'height')
    }
  }));
}

// Scales coordinates
function scaleCoordinate(coord, dimension) {
  if (dimension === 'x' || dimension === 'width')
    return (coord / model.referanceCanvas.width) * model.canvasProperties.width;
  else
    return (coord / model.referanceCanvas.height) * model.canvasProperties.height;
}

// Places scenario nodes on diagram or menu
function processNodes(scenarioNodes) {
  const processed = [];
  const CELL_WIDTH = 140;
  const CELL_HEIGHT = 100;
  const START_X = 50;

  const BASE_HEIGHT = model.canvasProperties.height;
  const MENU_START_Y = BASE_HEIGHT;

  const CELLS_PER_ROW = Math.floor((canvas.width - START_X) / CELL_WIDTH);

  if (menuCells.length > 0) {
    for (const n of model.currentScenario.nodes || []) {
      if (n.coordinates?.y >= MENU_START_Y - 10) {
        const cx = Math.floor((n.coordinates.x - START_X) / CELL_WIDTH);
        const cy = Math.floor((n.coordinates.y - MENU_START_Y) / CELL_HEIGHT);
        const idx = cy * CELLS_PER_ROW + cx;
        menuCells[idx] = true;
      }
    }
  }

  let cellIndex = 0;
  let maxRow = 0;

  for (const node of scenarioNodes) {
    const p = { ...node };
    p.width = node.type === "activity" ? 120 : 60;
    p.height = node.type === "activity" ? 80 : 60;

    if (node.coordinates) {
      p.coordinates = {
        x: scaleCoordinate(node.coordinates.x, 'x'),
        y: scaleCoordinate(node.coordinates.y, 'y')
      };
    } else {
      while (menuCells[cellIndex]) cellIndex++;
      const row = Math.floor(cellIndex / CELLS_PER_ROW);
      const col = cellIndex % CELLS_PER_ROW;
      maxRow = Math.max(maxRow, row);
      const xOffset = (CELL_WIDTH - p.width) / 2;

      p.coordinates = {
        x: START_X + (col * CELL_WIDTH) + xOffset,
        y: MENU_START_Y + (row * CELL_HEIGHT)
      };

      menuCells[cellIndex] = true;
      cellIndex++;
    }

    processed.push(p);
  }

  canvas.height = BASE_HEIGHT + (maxRow + 1) * CELL_HEIGHT;
  return processed;
}

// Redraws everything
function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawPools(model.currentScenario.pools);
  drawLanes(model.currentScenario.lanes);
  connectorCoordinates(model.currentScenario.connectors);
  drawNodes(model.currentScenario.nodes);
  drawTemporaryArrow();
}

// Moves to next scenario or post-quiz
function nextScenario() {
  if (model.game.currentScenario < model.game.numberOfScenarios - 1) {
    model.game.currentScenario++;
    loadScenarioInformation();
    loadScenarioData();
    draw();
  } else startQuiz("postQuiz");
}

// Canvas mousedown
function mouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  currentSelectedBox = null;

  const nodes = model.currentScenario.nodes;

  if (e.button === 2) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (mx > n.coordinates.x && mx < n.coordinates.x + n.width &&
          my > n.coordinates.y && my < n.coordinates.y + n.height) {
        connecting = true;
        startNode = n;
        tempLineEnd = { x: mx, y: my };
        return;
      }
    }
  }

  for (let n of nodes) {
    if (
      n.static !== true &&
      mx > n.coordinates.x && mx < n.coordinates.x + n.width &&
      my > n.coordinates.y && my < n.coordinates.y + n.height
    ) {
      draggingBox = n;
      currentSelectedBox = n;
      offsetX = mx - n.coordinates.x;
      offsetY = my - n.coordinates.y;
      break;
    }
  }

  draw();
}

// Canvas mousemove
function mouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (connecting && startNode) {
    tempLineEnd = { x: mx, y: my };
    draw();
    return;
  }

  if (!draggingBox) return;
  draggingBox.coordinates.x = mx - offsetX;
  draggingBox.coordinates.y = my - offsetY;
  draw();
}

// Canvas mouseup
function mouseUp(e) {
  if (connecting && startNode) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let n of model.currentScenario.nodes) {
      if (
        mx > n.coordinates.x && mx < n.coordinates.x + n.width &&
        my > n.coordinates.y && my < n.coordinates.y + n.height &&
        n !== startNode
      ) {
        const id = `connector_${connectorCounter++}`;
        const newConn = { connectorId: id, fromNodeId: startNode.nodeId, toNodeId: n.nodeId };

        const exists = model.currentScenario.connectors.some(c =>
          (c.fromNodeId === newConn.fromNodeId && c.toNodeId === newConn.toNodeId) ||
          (c.fromNodeId === newConn.toNodeId && c.toNodeId === newConn.fromNodeId)
        );

        if (!exists) model.currentScenario.connectors.push(newConn);
        break;
      }
    }

    connecting = false;
    startNode = null;
    draw();
  }

  draggingBox = null;
}

// Deletes connections
function resetConnections(resetAll = false) {
  if (resetAll) {
    model.currentScenario.connectors = [];
    for (const n of model.currentScenario.nodes) {
      if (n.type.includes("Gateway")) n.nodeConnections = [];
    }
    draw();
    return;
  }

  if (model.currentScenario.connectors.length === 0) return;

  let deletedIds = [];

  if (currentSelectedBox) {
    deletedIds = model.currentScenario.connectors
      .filter(c => c.fromNodeId === currentSelectedBox.nodeId || c.toNodeId === currentSelectedBox.nodeId)
      .map(c => c.connectorId);

    model.currentScenario.connectors = model.currentScenario.connectors.filter(c =>
      c.fromNodeId !== currentSelectedBox.nodeId &&
      c.toNodeId !== currentSelectedBox.nodeId
    );
  } else {
    const del = model.currentScenario.connectors.pop();
    deletedIds = [del.connectorId];
  }

  for (const n of model.currentScenario.nodes) {
    if (n.type.includes("Gateway") && n.nodeConnections) {
      n.nodeConnections = n.nodeConnections.filter(x => !deletedIds.includes(x.connectorId));
    }
  }

  draw();
}

// Simple end screen
function endScreen() {
  document.getElementById('scenarioTextHeader').innerHTML = `
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">
      All scenarios completed. Click here to take the quiz.
    </a>
  `;
}

// Starts pre/post quiz
function startQuiz(type) {
  currentQuizType = type;
  quizIndex = 0;
  quizScore = 0;
  quizData = model.loadedScenarioData.quizzes[type];
  showQuizQuestion();
}

// Shows score after quiz
function finishQuiz() {
  document.getElementById('app').innerHTML = `
    <h2>Score: ${quizScore}/${quizData.length}</h2>
    <button id="quizContinue">Continue</button>
  `;

  document.getElementById("quizContinue").onclick = () => {
    if (currentQuizType === "preQuiz") {
      const start = quizScore / quizData.length;
      player.knowledge = start;
      learner = new BKT(start);
      updateLearningDisplay();

      loadScenarioInformation();
      loadScenarioData();
      initCanvas();
      draw();
      return;
    }

    if (currentQuizType === "postQuiz") endScreen();
  };
}

// Player clicks Start Game
function startGame() {
  updateView();

  const initials = document.getElementById("initials").value.trim().toUpperCase();
  const day = document.getElementById("birthDay").value.trim().padStart(2, "0");
  const month = document.getElementById("birthMonth").value.trim().padStart(2, "0");

  if (!initials || !day || !month) {
    alert("Vennligst fyll ut alle felt (initialer, dag og måned).");
    return;
  }

  const playerID = `${initials}${day}${month}`;
  player.id = playerID;

  document.getElementById("loginSection").style.display = "none";
  document.getElementById("app").style.display = "block";

  loadScenarioJSON("scenarioData/scenario.json").then(data => {
    model.loadedScenarioData = data;
    startQuiz("preQuiz");
  });
}
