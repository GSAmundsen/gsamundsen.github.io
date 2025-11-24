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

// Quiz variables used during pre-quiz and post-quiz flow
let quizData = null;
let quizIndex = 0;
let quizScore = 0;
let currentQuizType = null;



// Shows one quiz question at a time, waits for answer, then moves to next
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



// Initializes the main BPMN canvas and sets up mouse listeners
async function initCanvas() {

  // Loads scenario JSON only once
  if (!model.loadedScenarioData) {
    model.loadedScenarioData = await loadScenarioJSON("scenarioData/scenario.json");
  }

  canvas = document.getElementById("BPMNcanvas");
  context = canvas.getContext("2d");

  canvas.width = model.canvasProperties.width;
  canvas.height = model.canvasProperties.height + 120;

  // Fill canvas with white background
  context.fillStyle = model.canvasProperties.backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Mouse listeners for draggable nodes and connectors
  canvas.addEventListener("mousedown", mouseDown);
  canvas.addEventListener("mousemove", mouseMove);
  canvas.addEventListener("mouseup", mouseUp);

  // Prevent right-click menu from appearing on canvas
  canvas.addEventListener("contextmenu", e => e.preventDefault());

  // DELETE key removes last connection
  document.addEventListener("keydown", e => {
    if (e.key === "Delete") resetConnections();
  });

  loadGameData();
  loadScenarioInformation();
  loadScenarioData();
  draw();
}



// Loads global metadata (title, description, number of scenarios)
function loadGameData() {
  const data = model.loadedScenarioData.aboutCampaign;
  model.game.numberOfScenarios = data.numberOfScenarios;
  model.game.moduleTitle = data.moduleTitle;
  model.game.moduleDescription = data.moduleDescription;
  model.game.endScreenText = data.endScreenText;
}



// Writes the scenario title + description into the UI panel above the canvas
function loadScenarioInformation() {
  document.getElementById("moduleTitleHeader").innerText = model.game.moduleTitle;
  document.getElementById("moduleTextHeader").innerText = model.game.moduleDescription;

  const sc = model.loadedScenarioData.scenarios[model.game.currentScenario];
  document.getElementById("taskText").innerText =
    sc.scenarioTitle + "\n" + sc.scenarioDescription;
}



// Loads pools, lanes, tokens, and nodes into the model for the selected scenario
function loadScenarioData() {
  const scenario = model.loadedScenarioData.scenarios[model.game.currentScenario];

  if (!model.currentScenario.nodes.length) {
    menuCells = [];
  }

  // Always load pools and lanes (they do not change)
  model.currentScenario.pools = loadStaticElements(scenario.static.pools);
  model.currentScenario.lanes = loadStaticElements(scenario.static.lanes);

  // Replace tokens with NEW scenario tokens
  model.currentScenario.tokens = scenario.tokens;

  // 🚫 DO NOT RESET ANYTHING HERE
  // We want the diagram to persist across scenarios

  // Add NEW nodes (merge)
  const newNodes = processNodes(scenario.nodes);
  model.currentScenario.nodes = [
    ...model.currentScenario.nodes, 
    ...newNodes
  ];

  // Merge failure descriptions
  model.currentScenario.failureDescriptions = {
    ...model.currentScenario.failureDescriptions,
    ...(scenario.failureDescriptions || {})
  };

  // Make sure an endEvent exists
  let endEvent = model.currentScenario.nodes.find(n => n.type === "endEvent");
  if (!endEvent) {
    const tempEnd = [{
      type: "endEvent",
      name: "End",
      nodeId: "node_end",
      functions: []
    }];
    const [processed] = processNodes(tempEnd);
    model.currentScenario.nodes.push(processed);
    endEvent = processed;
  }

  // Merge new scenario's required end checks
  endEvent.functions = [
    ...(endEvent.functions || []),
    ...(scenario.endEventChecks || [])
  ];
}




// Converts pools and lanes into scaled positions relative to user’s screen size
function loadStaticElements(elements) {
  return elements.map(el => ({
    ...el,
    coordinates: {
      x: scaleCoordinate(el.coordinates.x, "x"),
      y: scaleCoordinate(el.coordinates.y, "y")
    },
    size: {
      width: scaleCoordinate(el.size.width, "width"),
      height: scaleCoordinate(el.size.height, "height")
    }
  }));
}



// Converts a coordinate from the original 1200×800 reference to the resized canvas
function scaleCoordinate(coord, dimension) {
  const base = dimension === "x" || dimension === "width"
    ? model.referanceCanvas.width
    : model.referanceCanvas.height;

  const target = dimension === "x" || dimension === "width"
    ? model.canvasProperties.width
    : model.canvasProperties.height;

  return (coord / base) * target;
}



// Converts JSON BPMN nodes into drawable nodes, placing them in menu if no coordinates exist
function processNodes(scenarioNodes) {

  const processed = [];
  const CELL_WIDTH = 140;
  const CELL_HEIGHT = 100;
  const START_X = 50;

  const baseY = model.canvasProperties.height;
  const cellsPerRow = Math.floor((model.canvasProperties.width - START_X) / CELL_WIDTH);

  let cellIndex = menuCells.length;
  let maxRow = 0;

  for (const node of scenarioNodes) {

    if (model.currentScenario.nodes.some(n => n.nodeId === node.nodeId)) {
      continue;
    }

    const p = { ...node };

    p.width = node.type === "activity" ? 120 : 60;
    p.height = node.type === "activity" ? 80 : 60;

    if (node.coordinates) {
      p.coordinates = {
        x: scaleCoordinate(node.coordinates.x, "x"),
        y: scaleCoordinate(node.coordinates.y, "y")
      };
    }

    else {
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




// Clears canvas and redraws pools, lanes, nodes, connectors, and temporary arrows
function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  drawPools(model.currentScenario.pools);
  drawLanes(model.currentScenario.lanes);
  connectorCoordinates(model.currentScenario.connectors);
  drawNodes(model.currentScenario.nodes);
  drawTemporaryArrow();
}



// Moves to the next scenario or starts post-quiz when all scenarios are completed
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



// Handles left-click dragging and right-click start of connection lines
function mouseDown(e) {

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  currentSelectedBox = null;
  const nodes = model.currentScenario.nodes;

  // Right-click = begin connecting from a node
  if (e.button === 2) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
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

  // Left-click = begin dragging a node
  for (const n of nodes) {
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



// Handles dragging behavior or updates temporary connection lines during right-click drag
function mouseMove(e) {

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // While right-click dragging, update temporary arrow
  if (connecting && startNode) {
    tempLineEnd = { x: mx, y: my };
    draw();
    return;
  }

  // Dragging BPMN node
  if (draggingBox) {
    draggingBox.coordinates.x = mx - offsetX;
    draggingBox.coordinates.y = my - offsetY;
    draw();
  }
}



// Finalizes a connector when right-click is released on another node
function mouseUp(e) {

  // If user was drawing a connection
  if (connecting && startNode) {

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Try to find the node the user released on
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

        // Avoid duplicate connectors
        const exists = model.currentScenario.connectors.some(c =>
          (c.fromNodeId === newConn.fromNodeId && c.toNodeId === newConn.toNodeId) ||
          (c.fromNodeId === newConn.toNodeId && c.toNodeId === newConn.fromNodeId)
        );

        // Add connector and gateway metadata
        if (!exists) {
          model.currentScenario.connectors.push(newConn);

          if (startNode.type.includes("Gateway")) {
            if (!startNode.nodeConnections) {
              startNode.nodeConnections = [];
            }
            startNode.nodeConnections.push({
              connectorId: id
            });
          }
        }

        break;
      }
    }

    // Reset temporary connection state
    connecting = false;
    startNode = null;
    draw();
  }

  // Stop dragging the box
  draggingBox = null;
}




// Removes connectors either for entire scenario or only last-added one
function resetConnections(resetAll = false) {

  if (resetAll) {
    model.currentScenario.connectors = [];
    draw();
    return;
  }

  if (model.currentScenario.connectors.length === 0) return;

  // If a node is selected, remove only connectors touching that node
  if (currentSelectedBox) {
    const id = currentSelectedBox.nodeId;
    model.currentScenario.connectors =
      model.currentScenario.connectors.filter(c =>
        c.fromNodeId !== id && c.toNodeId !== id
      );
  }

  // Otherwise delete most recent connector
  else {
    model.currentScenario.connectors.pop();
  }

  draw();
}



// Displays final message after post-quiz is finished
function endScreen() {
  document.getElementById("scenarioTextHeader").innerHTML =
    `<h2>${model.game.endScreenText}</h2>`;
}



// Starts a quiz of a given type (preQuiz or postQuiz)
function startQuiz(type) {
  currentQuizType = type;
  quizIndex = 0;
  quizScore = 0;

  quizData = model.loadedScenarioData.quizzes[type];
  showQuizQuestion();
}



// Handles logic after finishing either quiz
function finishQuiz() {

  document.getElementById("app").innerHTML = `
    <h2>Score: ${quizScore}/${quizData.length}</h2>
    <button id="quizContinue">Continue</button>
  `;

  document.getElementById("quizContinue").onclick = () => {

    // Pre-quiz: initialize gameplay + starting knowledge
    if (currentQuizType === "preQuiz") {

      // Store pre-quiz score and set starting knowledge level
      storePreQuizScore(quizScore, quizData.length);

      // Build full game UI (this overwrites the DOM)
      updateView();

      // Now that UI exists again → update the visible knowledge level
      updateLearningDisplay();

      // Create canvas
      initCanvas();

      // Load scenario 1
      model.game.currentScenario = 0;
      loadScenarioInformation();
      loadScenarioData();
      draw();

      return;
    }

    // Post-quiz: store end score + show final screen
    if (currentQuizType === "postQuiz") {

      storePostQuizScore(quizScore, quizData.length);

      endScreen();
    }
  };
}





// Called when user presses “Start game” on login screen
function startGame() {

  const initials = document.getElementById("initials").value.trim().toUpperCase();
  const day = document.getElementById("birthDay").value.trim().padStart(2, "0");
  const month = document.getElementById("birthMonth").value.trim().padStart(2, "0");

  if (!initials || !day || !month) {
    alert("Vennligst fyll ut alle feltene.");
    return;
  }

  player.id = `${initials}${day}${month}`;

  // Hide login, show game app container
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("app").style.display = "block";

  // Load scenario JSON then start pre-quiz
  loadScenarioJSON("scenarioData/scenario.json").then(data => {
    model.loadedScenarioData = data;
    startQuiz("preQuiz");
  });
}
