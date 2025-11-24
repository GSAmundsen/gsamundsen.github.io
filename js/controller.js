// Canvas reference and drawing context used for all BPMN rendering
let canvas = null;
let context = null;

// Variables for dragging BPMN nodes with the mouse
let draggingBox = null;
let offsetX = 0;
let offsetY = 0;
let currentSelectedBox = null;

// Variables for drawing connections between nodes using right-click
let connecting = false;
let startNode = null;
let tempLineEnd = { x: 0, y: 0 };

// Unique ID counter for connectors so each arrow has a stable reference
let connectorCounter = 1;

// This array keeps track of which "menu slots" are occupied so nodes don’t overlap
let menuCells = [];

// Quiz variables
let quizData = null;
let quizIndex = 0;
let quizScore = 0;
let currentQuizType = null;



// Shows one quiz question at a time
function showQuizQuestion() {
  const qObj = quizData[quizIndex];
  const title = currentQuizType === "preQuiz" ? "Pre-Quiz" : "Post-Quiz";

  showQuizUI(title, qObj, quizIndex, quizData.length, selected => {
    if (selected === qObj.c) quizScore++;
    quizIndex++;

    if (quizIndex < quizData.length) {
      showQuizQuestion();
    } else {
      finishQuiz();
    }
  });
}



// Initializes the main BPMN canvas
async function initCanvas() {

  if (!model.loadedScenarioData) {
    model.loadedScenarioData = await loadScenarioJSON("scenarioData/scenario.json");
  }

  canvas = document.getElementById("BPMNcanvas");
  context = canvas.getContext("2d");

  canvas.width = model.canvasProperties.width;
  canvas.height = model.canvasProperties.height + 120;

  context.fillStyle = model.canvasProperties.backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  canvas.addEventListener("mousedown", mouseDown);
  canvas.addEventListener("mousemove", mouseMove);
  canvas.addEventListener("mouseup", mouseUp);

  canvas.addEventListener("contextmenu", e => e.preventDefault());

  document.addEventListener("keydown", e => {
    if (e.key === "Delete") resetConnections();
  });

  loadGameData();
  loadScenarioInformation();
  loadScenarioData();
  draw();
}



// Load global metadata
function loadGameData() {
  const data = model.loadedScenarioData.aboutCampaign;
  model.game.numberOfScenarios = data.numberOfScenarios;
  model.game.moduleTitle = data.moduleTitle;
  model.game.moduleDescription = data.moduleDescription;
  model.game.endScreenText = data.endScreenText;
}



// Load scenario text
function loadScenarioInformation() {
  document.getElementById("moduleTitleHeader").innerText = model.game.moduleTitle;
  document.getElementById("moduleTextHeader").innerText = model.game.moduleDescription;

  const sc = model.loadedScenarioData.scenarios[model.game.currentScenario];
  document.getElementById("taskText").innerText =
    sc.scenarioTitle + "\n" + sc.scenarioDescription;
}



// Load scenario merged nodes
function loadScenarioData() {
  const scenario = model.loadedScenarioData.scenarios[model.game.currentScenario];

  
  menuCells = [];
  model.currentScenario.nodes = [];
  model.currentScenario.connectors = [];
  model.currentScenario.pools = [];
  model.currentScenario.lanes = [];
  model.currentScenario.failureDescriptions = {};

  // Load pools & lanes
  model.currentScenario.pools = loadStaticElements(scenario.static.pools);
  model.currentScenario.lanes = loadStaticElements(scenario.static.lanes);

  // Replace tokens fully
  model.currentScenario.tokens = scenario.tokens;

  // Add nodes (NO merging)
  model.currentScenario.nodes = processNodes(scenario.nodes);

  // Merge failure descriptions
  model.currentScenario.failureDescriptions = {
    ...(scenario.failureDescriptions || {})
  };

  // Ensure end event exists
  let endEvent = model.currentScenario.nodes.find(n => n.type === "endEvent");
  if (!endEvent) {
    const fallbackEnd = [{
      type: "endEvent",
      name: "End",
      nodeId: "node_end",
      functions: []
    }];
    const [processed] = processNodes(fallbackEnd);
    model.currentScenario.nodes.push(processed);
    endEvent = processed;
  }

  // Add scenario checks
  endEvent.functions = [
    ...(endEvent.functions || []),
    ...(scenario.endEventChecks || [])
  ];
}





// Convert static references
function loadStaticElements(elements) {
  // prevent crashes if a scenario is missing static pools/lanes
  if (!elements || !Array.isArray(elements)) {
    console.warn("⚠ Missing static elements for scenario");
    return [];
  }

  return elements.map(el => ({
    ...el,
    coordinates: {
      x: scaleCoordinate(el.coordinates?.x ?? 0, "x"),
      y: scaleCoordinate(el.coordinates?.y ?? 0, "y")
    },
    size: {
      width: scaleCoordinate(el.size?.width ?? 200, "width"),
      height: scaleCoordinate(el.size?.height ?? 200, "height")
    }
  }));
}


function scaleCoordinate(coord, dimension) {
  const base =
    dimension === "x" || dimension === "width"
      ? model.referanceCanvas.width
      : model.referanceCanvas.height;

  const target =
    dimension === "x" || dimension === "width"
      ? model.canvasProperties.width
      : model.canvasProperties.height;

  return (coord / base) * target;
}



// Node placement (menu)
function processNodes(scenarioNodes) {

  const processed = [];
  const CELL_WIDTH = 140;
  const CELL_HEIGHT = 100;
  const START_X = 50;

  const baseY = model.canvasProperties.height;
  const cellsPerRow = Math.floor((model.canvasProperties.width - START_X) / CELL_WIDTH);

  let cellIndex = 0;
  let maxRow = 0;

  for (const node of scenarioNodes) {
    const p = { ...node };

    p.width = node.type === "activity" ? 120 : 60;
    p.height = node.type === "activity" ? 80 : 60;

    if (node.coordinates) {
      p.coordinates = {
        x: scaleCoordinate(node.coordinates.x, "x"),
        y: scaleCoordinate(node.coordinates.y, "y")
      };
    } else {
      while (menuCells[cellIndex]) cellIndex++;

      const row = Math.floor(cellIndex / cellsPerRow);
      const col = cellIndex % cellsPerRow;
      maxRow = Math.max(maxRow, row);

      const offset = (CELL_WIDTH - p.width) / 2;

      p.coordinates = {
        x: START_X + col * CELL_WIDTH + offset,
        y: baseY + row * CELL_HEIGHT
      };

      menuCells[cellIndex] = true;
      cellIndex++;
    }

    processed.push(p);
  }

  canvas.height = baseY + (maxRow + 1) * CELL_HEIGHT + 50;

  return processed;
}



// DRAW
function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  drawPools(model.currentScenario.pools);
  drawLanes(model.currentScenario.lanes);
  connectorCoordinates(model.currentScenario.connectors);
  drawNodes(model.currentScenario.nodes);
  drawTemporaryArrow();
}



// Next scenario
function nextScenario() {
  if (model.game.currentScenario < model.game.numberOfScenarios - 1) {
    model.game.currentScenario++;
    loadScenarioInformation();
    loadScenarioData();
    draw();
  } else {
    startQuiz("postQuiz");
  }
}



// MOUSE INTERACTION
function mouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  currentSelectedBox = null;

  if (e.button === 2) {
    for (let n of model.currentScenario.nodes) {
      if (
        mx > n.coordinates.x && mx < n.coordinates.x + n.width &&
        my > n.coordinates.y && my < n.coordinates.y + n.height
      ) {
        connecting = true;
        startNode = n;
        tempLineEnd = { x: mx, y: my };
        return;
      }
    }
  }

  for (let n of model.currentScenario.nodes) {
    if (
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

function mouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (connecting && startNode) {
    tempLineEnd = { x: mx, y: my };
    draw();
    return;
  }

  if (draggingBox) {
    draggingBox.coordinates.x = mx - offsetX;
    draggingBox.coordinates.y = my - offsetY;
    draw();
  }
}

function mouseUp(e) {
  if (connecting && startNode) {

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let n of model.currentScenario.nodes) {

      const inside =
        mx > n.coordinates.x &&
        mx < n.coordinates.x + n.width &&
        my > n.coordinates.y &&
        my < n.coordinates.y + n.height;

      const notSame = n !== startNode;

      if (inside && notSame) {

        const id = `connector_${connectorCounter++}`;
        const newConn = {
          connectorId: id,
          fromNodeId: startNode.nodeId,
          toNodeId: n.nodeId
        };

        const exists = model.currentScenario.connectors.some(c =>
          (c.fromNodeId === newConn.fromNodeId && c.toNodeId === newConn.toNodeId) ||
          (c.fromNodeId === newConn.toNodeId && c.toNodeId === newConn.fromNodeId)
        );

        if (!exists) {
          model.currentScenario.connectors.push(newConn);

          if (startNode.type.includes("Gateway")) {
            if (!startNode.nodeConnections) startNode.nodeConnections = [];
            startNode.nodeConnections.push({ connectorId: id });
          }
        }

        break;
      }
    }

    connecting = false;
    startNode = null;
    draw();
  }

  draggingBox = null;
}



// Reset connectors
function resetConnections(resetAll = false) {

  if (resetAll) {
    model.currentScenario.connectors = [];
    draw();
    return;
  }

  if (model.currentScenario.connectors.length === 0) return;

  if (currentSelectedBox) {
    const id = currentSelectedBox.nodeId;
    model.currentScenario.connectors =
      model.currentScenario.connectors.filter(c =>
        c.fromNodeId !== id && c.toNodeId !== id
      );
  } else {
    model.currentScenario.connectors.pop();
  }

  draw();
}



// End screen
function endScreen() {
  document.getElementById("scenarioTextHeader").innerHTML =
    `<h2>${model.game.endScreenText}</h2>`;
}



// Quiz start
function startQuiz(type) {
  currentQuizType = type;
  quizIndex = 0;
  quizScore = 0;

  quizData = model.loadedScenarioData.quizzes[type];
  showQuizQuestion();
}



// Finish quiz
function finishQuiz() {

  document.getElementById("app").innerHTML = `
    <h2>Score: ${quizScore}/${quizData.length}</h2>
    <button id="quizContinue">Continue</button>
  `;

  document.getElementById("quizContinue").onclick = () => {

    // PRE-QUIZ COMPLETED → START GAME
    if (currentQuizType === "preQuiz") {

      // Store pre-quiz data (knowledge + sheet send)
      storePreQuizScore(quizScore, quizData.length);

      // Build the full game UI (buttons, canvas container, text)
      updateView();

      // Update visible learning bar
      updateLearningDisplay();

      // Now create the canvas
      initCanvas();

      // Always start at scenario 0
      model.game.currentScenario = 0;

      // Load scenario text + nodes/pools/lanes
      loadScenarioInformation();
      loadScenarioData();

      // Draw everything
      draw();

      return;
    }

    // POST-QUIZ COMPLETED → END GAME
    if (currentQuizType === "postQuiz") {

      storePostQuizScore(quizScore, quizData.length);

      endScreen();
    }
  };
}





// Login → start game
function startGame() {

  const initials = document.getElementById("initials").value.trim().toUpperCase();
  const day = document.getElementById("birthDay").value.trim().padStart(2, "0");
  const month = document.getElementById("birthMonth").value.trim().padStart(2, "0");

  if (!initials || !day || !month) {
    alert("Vennligst fyll ut alle feltene.");
    return;
  }

  player.id = `${initials}${day}${month}`;

  document.getElementById("loginSection").style.display = "none";
  document.getElementById("app").style.display = "block";

  loadScenarioJSON("scenarioData/scenario.json").then(data => {
    model.loadedScenarioData = data;
    startQuiz("preQuiz");
  });
}
