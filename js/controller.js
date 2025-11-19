// Global canvas variables
let canvas = null;
let context = null;

// Variables used when moving draggable BPMN boxes
let draggingBox = null;
let offsetX = 0;
let offsetY = 0;
let currentSelectedBox = null;

// Variables used when drawing connections between nodes
let connecting = false;          // True when user is right-click dragging from a node
let startNode = null;            // Node where the connection starts
let tempLineEnd = { x: 0, y: 0 }; // Temporary mouse position while drawing arrow
let connectorCounter = 1;        // For generating unique connector IDs

// Keeps track of menu cell occupancy when placing nodes in bottom menu
let menuCells = [];

// Stores transition-based information about the user's solution
let currentUserSolution = [];
let testResults = []; 

// Quiz-related variables
let quizData = null;
let quizIndex = 0;
let quizScore = 0;
let currentQuizType = null;

// Initializes the canvas and loads the first scenario
async function initCanvas() {
  // Load scenario JSON file
  const scenarioData = await loadScenarioJSON('scenarioData/scenario.json');
  model.loadedScenarioData = scenarioData;

  // Prepare the drawing canvas
  canvas = document.getElementById('BPMNcanvas');
  context = canvas.getContext('2d');
  context.canvas.width = model.canvasProperties.width;
  context.canvas.height = model.canvasProperties.height + 100;

  // Set background color
  context.fillStyle = model.canvasProperties.backgroundColor;
  context.fillRect(0, 0, model.canvasProperties.width, model.canvasProperties.height);

  // Mouse event listeners
  canvas.addEventListener('mousedown', mouseDown);   // Detect click on nodes
  canvas.addEventListener('mousemove', mouseMove);   // Drag nodes or draw connection
  canvas.addEventListener('mouseup', mouseUp);       // Finish connection or stop drag

  // Prevent right-click menu (right-click is used to draw connectors)
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Delete key resets connections for selected node
  document.addEventListener('keydown', (e) => {
    if (e.key == 'Delete') {
      resetConnections();
    }
  });

  // Load scenario and draw it
  loadGameData();
  loadScenarioInformation();
  loadScenarioData();
  draw();
}

// Loads metadata about the module (title, description, number of scenarios)
function loadGameData() {
  const gameData = model.loadedScenarioData.aboutCampaign;

  model.game.numberOfScenarios = gameData.numberOfScenarios;
  model.game.moduleTitle = gameData.moduleTitle;
  model.game.moduleDescription = gameData.moduleDescription;
  model.game.endScreenText = gameData.endScreenText;
}

// Updates UI text above the canvas with scenario info
function loadScenarioInformation() {
  document.getElementById('moduleTitleHeader').innerText = model.game.moduleTitle;
  document.getElementById('moduleTextHeader').innerText = model.game.moduleDescription;

  document.getElementById('taskText').innerText =
    model.loadedScenarioData.scenarios[model.game.currentScenario].scenarioTitle + "\n" +
    model.loadedScenarioData.scenarios[model.game.currentScenario].scenarioDescription;
}

// Loads pools, lanes, tokens, nodes for the active scenario
function loadScenarioData() {
  const scenario = model.loadedScenarioData.scenarios[model.game.currentScenario];

  // Load static elements (pools + lanes)
  model.currentScenario.pools = loadStaticElements(scenario.static.pools);
  model.currentScenario.lanes = loadStaticElements(scenario.static.lanes);

  // Load tokens used by verifier
  model.currentScenario.tokens = scenario.tokens;

  // Reset canvas if defined in scenario JSON
  if (scenario.resetCanvas) {
    menuCells = [];
    model.currentScenario.nodes = processNodes(scenario.nodes);
    model.currentScenario.failureDescriptions = scenario.failureDescriptions || {};
    model.currentScenario.connectors = [];
  } else {
    // Append new nodes if scenario allows incremental canvas
    model.currentScenario.nodes = [
      ...model.currentScenario.nodes,
      ...processNodes(scenario.nodes)
    ];

    model.currentScenario.failureDescriptions = {
      ...model.currentScenario.failureDescriptions,
      ...scenario.failureDescriptions
    };
  }

  // Ensure scenario has an end event
  let endEvent = model.currentScenario.nodes.find(n => n.type === "endEvent");

  if (!endEvent) {
    const tempEndEvent = [{
      type: "endEvent",
      name: "End",
      nodeId: "node_end",
      functions: []
    }];

    // Place end event in menu using same logic as normal nodes
    const [processedEndEvent] = processNodes(tempEndEvent);

    model.currentScenario.nodes.push(processedEndEvent);
    endEvent = processedEndEvent;
  }

  // Add checker functions attached to endEvent
  endEvent.functions = [
    ...(endEvent.functions || []),
    ...(scenario.endEventChecks || [])
  ];
}

// Converts static BPMN elements to scaled canvas positions
function loadStaticElements(elements) {
  return elements.map(element => ({
    ...element,
    coordinates: {
      x: scaleCoordinate(element.coordinates.x, 'x'),
      y: scaleCoordinate(element.coordinates.y, 'y')
    },
    size: {
      width: scaleCoordinate(element.size.width, 'width'),
      height: scaleCoordinate(element.size.height, 'height')
    }
  }));
}

// Scales coordinates based on screen size
function scaleCoordinate(coord, dimension) {
  if (dimension === 'x' || dimension === 'width') {
    return (coord / model.referanceCanvas.width) * model.canvasProperties.width;
  } else {
    return (coord / model.referanceCanvas.height) * model.canvasProperties.height;
  }
}
// Places scenario nodes onto the canvas or bottom menu depending on coordinates
function processNodes(scenarioNodes) {
  const processed = [];

  // Bottom menu placement grid
  const CELL_WIDTH = 140;
  const CELL_HEIGHT = 100;
  const START_X = 50;

  const BASE_HEIGHT = model.canvasProperties.height;  // Top diagram area height
  const MENU_START_Y = BASE_HEIGHT;                   // Menu begins immediately below diagram

  // Number of cells per row in bottom area
  const CELLS_PER_ROW = Math.floor((canvas.width - START_X) / CELL_WIDTH);

  // If menu already contains nodes from earlier scenarios, track used cells
  if (menuCells.length > 0) {
    for (const node of model.currentScenario.nodes || []) {
      if (node.coordinates?.y >= MENU_START_Y - 10) {
        const cellX = Math.floor((node.coordinates.x - START_X) / CELL_WIDTH);
        const cellY = Math.floor((node.coordinates.y - MENU_START_Y) / CELL_HEIGHT);
        const cellIndex = cellY * CELLS_PER_ROW + cellX;
        menuCells[cellIndex] = true;
      }
    }
  }

  let cellIndex = 0;
  let maxRow = 0;

  for (const node of scenarioNodes) {
    const processedNode = { ...node };

    // Activities are larger than events/gateways
    if (node.type === "activity") {
      processedNode.width = 120;
      processedNode.height = 80;
    } else {
      processedNode.width = 60;
      processedNode.height = 60;
    }

    // If coordinates are defined, place node in the diagram
    if (node.coordinates) {
      processedNode.coordinates = {
        x: scaleCoordinate(node.coordinates.x, 'x'),
        y: scaleCoordinate(node.coordinates.y, 'y')
      };
    } 
    // Otherwise place node in the bottom menu
    else {
      // Skip already used menu cells
      while (menuCells[cellIndex]) cellIndex++;

      const row = Math.floor(cellIndex / CELLS_PER_ROW);
      const col = cellIndex % CELLS_PER_ROW;

      maxRow = Math.max(maxRow, row);

      // Center node inside the menu grid cell
      const xOffset = (CELL_WIDTH - processedNode.width) / 2;

      processedNode.coordinates = {
        x: START_X + (col * CELL_WIDTH) + xOffset,
        y: MENU_START_Y + (row * CELL_HEIGHT)
      };

      menuCells[cellIndex] = true;
      cellIndex++;
    }

    processed.push(processedNode);
  }

  // Adjust canvas height to fit all menu rows
  const menuRows = maxRow + 1;
  canvas.height = BASE_HEIGHT + (menuRows * CELL_HEIGHT);

  return processed;
}

// Redraws everything on the canvas (pools, lanes, nodes, connectors)
function draw() {
  // Clear entire canvas to prevent drawing artifacts
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Drawing order ensures correct layering
  drawPools(model.currentScenario.pools);
  drawLanes(model.currentScenario.lanes);
  connectorCoordinates(model.currentScenario.connectors);
  drawNodes(model.currentScenario.nodes);
  drawTemporaryArrow();
}

// Handles moving to the next scenario, or ending with post-quiz
function nextScenario() {
  if (model.game.currentScenario < model.game.numberOfScenarios - 1) {
    model.game.currentScenario += 1;
    loadScenarioInformation();
    loadScenarioData();
    draw();
  } else {
    // All scenarios done → start post-quiz
    startQuiz("postQuiz");
  }
}
// Fired when user presses mouse button on canvas
function mouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Clear previously selected box if clicking outside a node
  currentSelectedBox = null;

  const allNodes = model.currentScenario.nodes;

  // Right-click = begin drawing a connector
  if (e.button === 2) {
    for (let i = allNodes.length - 1; i >= 0; i--) {
      const node = allNodes[i];

      // Check if clicking inside this node
      if (
        mouseX > node.coordinates.x &&
        mouseX < node.coordinates.x + node.width &&
        mouseY > node.coordinates.y &&
        mouseY < node.coordinates.y + node.height
      ) {
        // Start connecting from this node
        connecting = true;
        startNode = node;
        tempLineEnd = { x: mouseX, y: mouseY };
        return;
      }
    }
  }

  // Left-click = drag node
  for (let node of allNodes) {
    if (
      node.static !== true &&
      mouseX > node.coordinates.x &&
      mouseX < node.coordinates.x + node.width &&
      mouseY > node.coordinates.y &&
      mouseY < node.coordinates.y + node.height
    ) {
      draggingBox = node;
      currentSelectedBox = node; // Track which node was clicked
      offsetX = mouseX - node.coordinates.x;
      offsetY = mouseY - node.coordinates.y;
      break;
    }
  }

  draw();
}

// Fired continuously while user moves the mouse
function mouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // If drawing a connector, update temporary arrow endpoint
  if (connecting && startNode) {
    tempLineEnd = { x: mouseX, y: mouseY };
    draw();
    return;
  }

  // If dragging a node, update its coordinates
  if (!draggingBox) return;

  draggingBox.coordinates.x = mouseX - offsetX;
  draggingBox.coordinates.y = mouseY - offsetY;

  draw();
}

// Fired when user releases mouse button (finishes drag or connection)
function mouseUp(e) {
  // If completing a connector
  if (connecting && startNode) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (let node of model.currentScenario.nodes) {
      if (
        mouseX > node.coordinates.x &&
        mouseX < node.coordinates.x + node.width &&
        mouseY > node.coordinates.y &&
        mouseY < node.coordinates.y + node.height &&
        node !== startNode
      ) {
        // Build connector object
        const connector_id = `connector_${connectorCounter++}`;
        const newConn = {
          connectorId: connector_id,
          fromNodeId: startNode.nodeId,
          toNodeId: node.nodeId
        };

        // Prevent duplicate connectors
        const exists = model.currentScenario.connectors.some(c =>
          (c.fromNodeId === newConn.fromNodeId && c.toNodeId === newConn.toNodeId) ||
          (c.fromNodeId === newConn.toNodeId && c.toNodeId === newConn.fromNodeId)
        );

        if (!exists) {
          // Handle special BPMN gateway logic
          switch (startNode.type) {
            case "xorGateway": {
              startNode.nodeConnections = startNode.nodeConnections || [];

              // XOR can only have two outgoing connections
              if (startNode.nodeConnections.length >= 2) break;

              // First path: condition = true, second: false
              startNode.nodeConnections.push({
                connectorId: connector_id,
                condition: startNode.nodeConnections.length === 0
              });

              model.currentScenario.connectors.push(newConn);
              break;
            }

            case "andGateway": {
              startNode.nodeConnections = startNode.nodeConnections || [];
              startNode.nodeConnections.push({ connectorId: connector_id });
              model.currentScenario.connectors.push(newConn);
              break;
            }

            case "inclusiveGateway": {
              startNode.nodeConnections = startNode.nodeConnections || [];
              startNode.functions = startNode.functions || [];

              const index = startNode.nodeConnections.length;

              // Inclusive gateway cannot exceed number of defined functions
              if (index >= startNode.functions.length) break;

              startNode.nodeConnections.push({
                connectorId: connector_id,
                functionIndex: index
              });

              model.currentScenario.connectors.push(newConn);
              break;
            }

            default:
              // Normal node → always allow connector
              model.currentScenario.connectors.push(newConn);
          }
        }

        break;
      }
    }

    // Reset connection mode
    connecting = false;
    startNode = null;
    draw();
  }

  // End node dragging
  draggingBox = null;
}

// Removes connections based on selection or deletes the last connector
function resetConnections(resetAll = false) {
  // Reset entire canvas connections
  if (resetAll) {
    model.currentScenario.connectors = [];

    // Reset gateway-specific connection data
    for (const node of model.currentScenario.nodes) {
      if (node.type.includes("Gateway")) {
        node.nodeConnections = [];
      }
    }

    draw();
    return;
  }

  // If no connectors exist, nothing to delete
  if (model.currentScenario.connectors.length === 0) return;

  let deletedIds = [];

  if (currentSelectedBox != null) {
    // Remove all connectors touching the selected node
    deletedIds = model.currentScenario.connectors
      .filter(c => c.fromNodeId === currentSelectedBox.nodeId || c.toNodeId === currentSelectedBox.nodeId)
      .map(c => c.connectorId);

    // Remove connectors associated with selected node
    model.currentScenario.connectors = model.currentScenario.connectors.filter(conn =>
      conn.fromNodeId !== currentSelectedBox.nodeId &&
      conn.toNodeId !== currentSelectedBox.nodeId
    );
  } else {
    // Delete last connector added
    const deleted = model.currentScenario.connectors.pop();
    deletedIds = [deleted.connectorId];
  }

  // Clean gateway connector references
  for (const node of model.currentScenario.nodes) {
    if (node.type.includes("Gateway") && node.nodeConnections) {
      node.nodeConnections = node.nodeConnections.filter(nc =>
        !deletedIds.includes(nc.connectorId)
      );
    }
  }

  draw();
}
// Shows simple end screen after finishing post-quiz
function endScreen() {
  document.getElementById('scenarioTextHeader').innerHTML = `
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">
      All scenarios completed. Click here to take the quiz.
    </a>
  `;
}

// Starts either preQuiz or postQuiz
function startQuiz(type) {
  currentQuizType = type;
  quizIndex = 0;
  quizScore = 0;

  // Load quiz data from scenario JSON
  quizData = model.loadedScenarioData.quizzes[type];

  showQuizQuestion();
}

// Displays the current quiz question using showQuizUI()
showQuizUI(
    currentQuizType === "preQuiz" ? "Pre-Quiz" : "Post-Quiz",
    qObj,
    quizIndex,
    quizData.length,
    (selected) => {

        // selected is already numeric (0,1,2,3)
        if (selected === qObj.c) {
            quizScore++;
        }

        quizIndex++;

        if (quizIndex < quizData.length) {
            showQuizQuestion();
        } else {
            finishQuiz();
        }
    }
  );

}


// Shows score screen and handles what happens next
function finishQuiz() {
  document.getElementById('app').innerHTML = `
    <h2>Score: ${quizScore}/${quizData.length}</h2>
    <button id="quizContinue">Continue</button>
  `;

  document.getElementById("quizContinue").onclick = () => {

    // PRE QUIZ: Initialize learning model
    if (currentQuizType === "preQuiz") {
      const start = quizScore / quizData.length;

      // Update player's initial knowledge
      player.knowledge = start;
      learner = new BKT(start);
      updateLearningDisplay();

      // Load first scenario view
      loadScenarioInformation();
      loadScenarioData();
      initCanvas();
      draw();
      return;
    }

    // POST QUIZ → show end screen
    if (currentQuizType === "postQuiz") {
      endScreen();
    }
  };
}

// Handles beginning of gameplay when user clicks "Start Game"
function startGame() {

  // Show empty game container (no canvas yet)
  updateView();

  // Read login form fields
  const initials = document.getElementById("initials").value.trim().toUpperCase();
  const day = document.getElementById("birthDay").value.trim().padStart(2, "0");
  const month = document.getElementById("birthMonth").value.trim().padStart(2, "0");

  // Validate
  if (!initials || !day || !month) {
    alert("Vennligst fyll ut alle felt (initialer, dag og måned).");
    return;
  }

  // Build player ID
  const playerID = `${initials}${day}${month}`;
  player.id = playerID;

  console.log("Spiller-ID:", player.id);

  // Hide login and show main area
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("app").style.display = "block";

  // Load JSON and start quiz
  loadScenarioJSON("scenarioData/scenario.json").then(data => {
    model.loadedScenarioData = data;
    startQuiz("preQuiz");
  });


}




