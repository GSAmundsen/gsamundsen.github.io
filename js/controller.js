//Globale vars
let canvas = null;
let context = null;
let boxes = [];
let lanes = [];

//Global vars to help with dragging boxes
let draggingBox = null;
let offsetX = 0;
let offsetY = 0;

let currentSelectedBox = null; // Used to store the last clicked box

//mellomlagrer brukerens løsning. I denne foreløpige løsningen, lagres KUN transitions mellom bokser.
let currentUserSolution = []; 

// === Global vars for connections ===
let connections = []; // {fromId: "node_1", toId: "node_3"}
let connecting = false;
let startNode = null;
let tempLineEnd = { x: 0, y: 0 };



async function initCanvas() 
{
  // Loads game data - This needs to be loaded first, before any BMPN Elements
  const scenarioData = await loadScenarioJSON('scenarioData/scenario.json')
  model.loadedScenarioData = scenarioData; // stores all data loaded from JSON
  
    //Gets the canvas element, laget i view.js, og setter bredde, høyde og farge
    canvas = document.getElementById('BPMNcanvas');
    context = canvas.getContext('2d');
    context.canvas.width = model.canvasProperties.width;
    context.canvas.height = model.canvasProperties.height;
    context.fillStyle = model.canvasProperties.backgroundColor;
    context.fillRect(0, 0, model.canvasProperties.width, model.canvasProperties.height);

    //Adds key listeners,
    // Legger til listeners, slik at funksjoner blir kalt ved musehendelser ('intern event systemet henter', funksjonen som skal kalles)
    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('mouseup', mouseUp); 

    canvas.addEventListener("contextmenu", (e) => e.preventDefault()); //prevents context menu when right clicking (creating connections)

    document.addEventListener('keydown', (e) => {if(e.key == 'Delete'){ resetConnections(); }});

    console.log(canvas);

    //Laster inn all data, så kaller draw();
    loadGameData(); //Loads from JSON
    loadScenario();
}

// Loads objects from loadedScenarioData into model.game
function loadGameData(){
  const gameData = model.loadedScenarioData.aboutScenarios;
  model.game.numberOfScenarios = gameData.numberOfScenarios
  model.game.moduleTitle = gameData.mainTitle
  model.game.moduleDescription = gameData.moduleDescription

}


function loadScenario(){

    //Henter info fra modellen, og oppdaterer view. Her henter den teksten for det nåværende scenarioet
    document.getElementById('moduleTitleHeader').innerText = model.game.moduleTitle;
    document.getElementById('moduleTextHeader').innerText = model.game.moduleDescription;

    // Henter bokser fra modellen...
    boxes = boxes.concat(processBoxes()); //henter bokser fra modellen, og kalkulerer x posisjon for boksene
    lanes = processLanes();
    //Setter Passasjer description, er egen funksjon fordi den endres ved verifisering. 
    setTaskDescription();

    //Når alt er lastet, tegn opp alt.
    draw()
}

function setTaskDescription()
{
  document.getElementById('taskText').innerText = model.loadedScenarioData.scenarios[model.game.currentScenario].scenarioTitle + "\n" + model.loadedScenarioData.scenarios[model.game.currentScenario].scenarioDescription

  let tokens = model.loadedScenarioData.scenarios[model.game.currentScenario].tokens;
  
  let verificationTextObject = document.getElementById('taskVerificationText');
  verificationTextObject.innerHTML = "";

  for(let i = 0; i < tokens.length; i++)
  {
      //using explicit true/false, since token.hasPassed can be null, its assigned during verification.
      if(tokens[i].hasPassed === true) {
        verificationTextObject.innerHTML += `${tokens[i].name} ${tokens[i].tasksHint} <span style='color: green;'>PASS</span> <br>` 
      }
      else if(tokens[i].hasPassed === false){
        verificationTextObject.innerHTML += `${tokens[i].name} ${tokens[i].tasksHint} <span style='color: red;'>FAIL</span> <br>` 
      }else{
        verificationTextObject.innerHTML += `${tokens[i].name} ${tokens[i].tasksHint} <br>`
      }
  }
}


//This function takes the tasks/activity and gateways from the JSON, and sets a nodeId, and the start position of each box on the canvas
function processBoxes(){
    
  //Only processes boxes from the current scenario, does nothing with the existing
  let newBoxes = model.loadedScenarioData.scenarios[model.game.currentScenario].nodes
  let nextXpos = canvas.width/3; //Since we dont know the boxes width beforehand, we approximate the start point

  //Ensures sequential numbering, when adding new boxes.
  let numberOfExistingBoxesInCanvas = boxes.length;
  for (let i = 0; i < newBoxes.length; i++) {
      // each box gets a unique nodeId
      newBoxes[i].nodeId = `node_${numberOfExistingBoxesInCanvas + (i+1)}`;

      //Sets the widht and height of each box
      if(newBoxes[i].type === "activity") {newBoxes[i].w = model.game.activityBoxWidth; newBoxes[i].h = model.game.activityBoxHeight;}
      else {newBoxes[i].w = 60; newBoxes[i].h = 60}
        
      // Sets the x and y position on the canvas
        newBoxes[i].x = nextXpos;
        newBoxes[i].y = canvas.height - 95;
        
        nextXpos += newBoxes[i].w + 10 //The next X position is this box's width, +10 px margin
    } 
    console.log("Boxes processed: ", newBoxes);
    return newBoxes;
} 


// Calculates the lane heigh and y position, by the number of lanes in the scenario.
function processLanes(){
    let lanes = model.loadedScenarioData.scenarios[model.game.currentScenario].poolLanes; 
    let laneHeight = ((canvas.height-100) / lanes.length); //Leaving a 100px gap at the bottom for tasks/gateways

    for (let i = 0; i < lanes.length; i++) {
        // Sett x og y posisjon
        lanes[i].x = canvas.width * 0.05; //Lanes should start at 5% of the canvas width
        lanes[i].y = laneHeight * i; //increases .y position, to stack lanes on top of eachother
        lanes[i].w = canvas.width * 0.95 // Widht of the lane is 5% shorter than the canvas. Padding.
        lanes[i].h = laneHeight; // sets the heigh of the lane
    } 
    console.log("Lanes processed: ", lanes);
    return lanes;
} 






//draws all the elements in the Canvas
function draw() {
  // clear the canvas every update, prevents "drawing" when dragging
  context.clearRect(0, 0, canvas.width, canvas.height);

  drawLanes(lanes); // Passing the processed list of lanes as an argument to the drawLanes function
  drawConnections(); //Draws any connections


  //Draw all the processed boxes first, so they end up "on top of" the connection lines.
  for (let box of boxes) {
    const centerX = box.x + box.w / 2;
    const centerY = box.y + box.h / 2;

    // The color of the box changes depending on if its selected or not
    if (currentSelectedBox != null && currentSelectedBox.nodeId == box.nodeId) {
      context.fillStyle = model.settings.selectedBoxColor;
    } else {
      context.fillStyle = model.settings.standardBoxColor;
    }


    // Draws the correct box (gateway, activity/task or start/end) depending on type
    if (box.type === "xorGateway") {
      drawExclusiveGateway(centerX, centerY, 60); // Exclusve (X)
    } else if (box.type === "andGateway") {
      drawParallelGateway(centerX, centerY, 60);  // Parallell (+)
    } else if (box.type === "inclusiveGateway") {
      drawInclusiveGateway(centerX, centerY, 60); // Inclusive (O)
    } else if (box.type === "activity"){ 
      drawTaskBox(box.x, box.y);// Task/Activity boxes
    } else { 
      drawStartEndBoxes(box.x, box.y); //This just leaves Start and End event boxes
    }
      
    // Adds the text to all boxes, Gateways have their text offset to below their box
    drawBoxText(centerX, centerY, box)

    drawPoolTitle()
    

  }
}


//Triggered by the user pressing the "delete" key, or pressing the "Reset All" button.
function resetConnections(resetAll = false) {
  //En liten "override" til en "Reset" knapp, resetAll vil alltid være default False, om den er True sletter den alle koblinger
  if(resetAll == true){
    currentUserSolution = [];
    connections = [];
    draw();
    return;
  }

  // This checks if the selected box has any connections, then deletes those connections.
  // if no connections are found, we delete the last entry in the connections array instead
  if(Object.keys(connections).length != 0){  //If there are any connections..
    if(currentSelectedBox != null){ //..and a box is selected...
      connections = connections.filter(object => { //..go through the array, and check if nodeObjects toId or fromId contains the selected box' nodeId
      
      //if the nodeId we are looking for neither in the fromId, or toId of the current object...
      if(!object.fromId.includes(currentSelectedBox.nodeId) && !object.toId.includes(currentSelectedBox.nodeId))
      {
        return true; //...we keep this box (nodeObject) in the list of connections
      }else{
        return false; //..if it is a match, we do not keep it in the connections array, meaning it will not be redrawn in the canvas (which draws connections based on the connection array)
      } 
      })
    }else{// if no box is selected, simply pop and delete the last connection object ({fromId:, toId:}) from the list of connections.
      let lastLine = connections.pop();
      delete connections[lastLine];
    }
  } 

  //re draws the canvas, with the updated connections array.
  draw();
}


// Triggers on mouseClick
function mouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  currentSelectedBox = null; //If not clicking a box, deselects the selected box.

  // right click to start drawing an arror (connection)
  if (e.button === 2) {
    for (let b of boxes) {
      if (
        mouseX > b.x && mouseX < b.x + b.w &&
        mouseY > b.y && mouseY < b.y + b.h
      ) {
        connecting = true;
        startNode = b;
        tempLineEnd = { x: mouseX, y: mouseY };
        console.log("Startet kobling fra:", b.nodeId);
        return;
      }
    }
  } else {
    // left click moves the box
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (
        mouseX > b.x && mouseX < b.x + b.w &&
        mouseY > b.y && mouseY < b.y + b.h
      ) {
        draggingBox = b;
        currentSelectedBox = b; //stores the last clicked box
        offsetX = mouseX - b.x;
        offsetY = mouseY - b.y;
        break;
      }
    }
    if(currentSelectedBox != null){console.log(currentSelectedBox.nodeId)}; // Testing, last box clicked logged to console.
  }

  draw(); //This draw call is needed to update the selected box, redrawing its color
}

// When the mouse is moves
function mouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // if drawing an arrow
  if (connecting && startNode) {
    tempLineEnd = { x: mouseX, y: mouseY };
    draw();
    drawArrow(startNode.x + startNode.w / 2, startNode.y + startNode.h / 2, mouseX, mouseY);
    return;
  }

  // Moving a box
  if (!draggingBox) return;
  draggingBox.x = mouseX - offsetX;
  draggingBox.y = mouseY - offsetY;
  draw();
}

// when mouse button is released
function mouseUp(e) {

  //If we are making a connection (holding RMB)
  if (connecting && startNode) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (let b of boxes) {
      if (
        mouseX > b.x && mouseX < b.x + b.w &&
        mouseY > b.y && mouseY < b.y + b.h &&
        b !== startNode
      ) {
        const newConn = { fromId: startNode.nodeId, toId: b.nodeId };
        
        //Check if the connection already exists, or if the reverse exists, preventing it.
        if (!connections.some(c => (c.fromId === newConn.fromId && c.toId === newConn.toId) || (c.fromId === newConn.toId && c.toId === newConn.fromId))) {
          connections.push(newConn);
          console.log("Ny kobling:", newConn);
        }
      }
    }

    connecting = false;
    startNode = null;
    draw();
  }

  draggingBox = null;
}


//Loads the next scenario
function nextScenario(){
    if(model.game.currentScenario < model.loadedScenarioData.scenarios.length-1){
        model.game.currentScenario += 1;
        loadScenario(); //updates the task text for the new scenario
        draw();
    } else {
        //If there are no more scenarios.
        showLinkToQuiz();
        
    }
}

//We use this to point the user to the exit-quiz. For learning measurement
function showLinkToQuiz(){
    //Viser en alert box med link til quiz
    document.getElementById('finishedTextHeader').innerHTML = /*html*/`
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">All scenarios completed<br>Please continue to the last quiz</a>
    `; 
}

// Compares the users solution against the corrent solution (from the JSON)
function verifySolution() {
  // Nullstiller tidligere data
  let results = [];
  let allTokensCorrect;

  //creating an array of objects containing "nodeID" and "task" from the nodes in the "boxes" array created earlier
  let nodeTaskMap = Object.fromEntries(boxes.map(n => [n.nodeId, n.task]));
  //putting together the users solution, {task, task} to compare with the predefined solution.
  currentUserSolution = connections.map(task => [nodeTaskMap[task.fromId], nodeTaskMap[task.toId]]); 

  //Converting the users solution to strings for comparison, storing in a new temp var
  let userSolution = new Set(currentUserSolution.map(pairs => JSON.stringify(pairs)))
  console.log(userSolution);

  for (let token of model.loadedScenarioData.scenarios[model.game.currentScenario].tokens)
  {
    if(token.requiredTasks.every(pair => userSolution.has(JSON.stringify(pair))))
    {
      console.log(token.name + " Passed");
      token.hasPassed = true;
      results.push(1);
    } else {
      console.log(token.name + " Failed");
      token.hasPassed = false;
      results.push(0);
    }
  }

  //If every token was correct, if one failed, the learning system takes it as failed.
  allTokensCorrect = model.loadedScenarioData.scenarios[model.game.currentScenario].tokens.every(tkn => tkn.hasPassed == true);

  setTaskDescription(); //Updates the status of the task description, feedback to user (pass/fail)
  updateLearning(allTokensCorrect); // Updates the BKT learning model

 



//  STARTSPILL-FUNKSJON 
// Denne funksjonen kjører når brukeren trykker "Start spill"
function startGame() {

  updateView();


  // Hent verdier fra input-feltene
  const initials = document.getElementById("initials").value.trim().toUpperCase();
  const day = document.getElementById("birthDay").value.trim().padStart(2, "0");
  const month = document.getElementById("birthMonth").value.trim().padStart(2, "0");

  // Sjekk at alle felt er fylt inn
  if (!initials || !day || !month) {
    alert("Vennligst fyll ut alle felt (initialer, dag og måned).");
    return;
  }

  // Bygger spiller-ID, f.eks. TS2607
  const playerID = `${initials}${day}${month}`;
  player.id = playerID;
  console.log("Spiller-ID:", player.id);

  // Skjul login-seksjonen og vis spillet
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("app").style.display = "block";


  initCanvas();

  // Oppdaterer visning av kunnskapsnivå
  updateLearningDisplay();
}

//  UI update function  
function updateLearningDisplay() {
  const val = document.getElementById("knowledgeValue");
  if (val && player) {
    val.textContent = player.knowledge.toFixed(2);
  }
}

