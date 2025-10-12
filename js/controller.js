//Globale vars
let canvas = null;
let context = null;
let boxes = [];
//mellomlagrer brukerens løsning. I denne foreløpige løsningen, lagres KUN transitions mellom bokser.
let currentUserSolution = [["start","task1"],["start", "task2"],["task2","task1"],["task1","end"]]; 
// === Globale variabler for koblinger ===
let connections = []; // {fromId: "node_1", toId: "node_3"}
let connecting = false;
let startNode = null;
let tempLineEnd = { x: 0, y: 0 };




function initCanvas() 
{
    //Henter canvas elementet, laget i view.js, og setter bredde, høyde og farge
    canvas = document.getElementById('BPMNcanvas');
    context = canvas.getContext('2d');
    context.canvas.width = model.canvasProperties.width;
    context.canvas.height = model.canvasProperties.height;
    context.fillStyle = model.canvasProperties.backgroundColor;
    context.fillRect(0, 0, model.canvasProperties.width, model.canvasProperties.height);

    // Legger til listeners, slik at funksjoner blir kalt ved musehendelser ('intern event systemet henter', funksjonen som skal kalles)
    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('mouseup', mouseUp); 

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    console.log(canvas);

    //Laster inn all data, så kaller draw();
    loadScenario();
}

function loadScenario(){

    //Scenario data fra JSON må lastes inn her.


    //Om scenariodata fra JSON IKKE skal lastes inn i modellen, må det endres HVOR systemet henter data fra.
    //Jeg tenker at aller helst bør man ha en mellomlagring, som enten tar inn JSON data, eller henter fra modellen. 
    //Så kan systemet bruke denne mellomlagringen som "kilde" for å hente data til view og controller.

    //Henter info fra modellen, og oppdaterer view. Her henter den teksten for det nåværende scenarioet
    document.getElementById('scenarioTextHeader').innerText = model.ScenarioLevels[model.game.currentScenario].scenarioDescription;

    // Henter bokser fra modellen...
    boxes = processBoxes(); //henter bokser fra modellen, og kalkulerer x posisjon for boksene


    //Når alt er lastet, tegn opp alt.
    draw()
}



// ...etter å ha kalkulert x posisjon for boksene, basert på antall bokser slik at de spres utover
function processBoxes(){
    let boxes = model.ScenarioLevels[model.game.currentScenario].BoxesList; 
    let nextXpos = 0;

    for (let i = 0; i < boxes.length; i++) {
        // Gi hver boks en unik ID i formatet "node_N"
        boxes[i].nodeId = `node_${i + 1}`;

        // Beregn x-posisjon
        (i == 0) ? nextXpos += 20 : nextXpos += boxes[i-1].w + 20;
        boxes[i].x = nextXpos;
    } 
    console.log("Boxes processed: ", boxes);
    return boxes;
} 

//Globale variabler som brukes til å holde styr på hvilken boks som dras, og offset for å få riktig posisjon
let draggingBox = null;
let offsetX = 0;
let offsetY = 0;

function drawArrow(fromX, fromY, toX, toY) {
  const headlen = 10;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.strokeStyle = "blue";
  context.lineWidth = 2;
  context.stroke();

  // Tegn pilspiss
  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  context.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fillStyle = "blue";
  context.fill();
}


//Sletter canvas, og tegner opp alt på nytt. Kalles hovedsakelig når musen flyttes (mouseMove())
function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Tegn alle koblinger først
  if(Object.keys(connections).length != 0) //Om vi skal bruke "Dictionary" (Objekt, i javascript siden js ikke bruker dict.)
  {
    for (let c of connections) {
      const from = boxes.find(b => b.nodeId === c.fromId);
      const to = boxes.find(b => b.nodeId === c.toId);
      if (from && to) {
        drawArrow(from.x + from.w / 2, from.y + from.h / 2, to.x + to.w / 2, to.y + to.h / 2);
      }
    }
  }

  // Tegn alle bokser oppå
  for (let box of boxes) {
    context.fillStyle = box.color;
    context.fillRect(box.x, box.y, box.w, box.h);
    context.fillStyle = "black";
    context.font = "14px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(box.text, box.x + box.w / 2, box.y + box.h / 2);
  }
}

// function deleteConnections()
// {
//     console.log("Cleared")
//     connections = {};
//     draw();
// }

function resetConnections() {
  if(Object.keys(connections).length != 0){ 
      let lastLine = connections.pop();
      delete connections[lastLine];
  }

  currentUserSolution = [];
  draw();
  console.log("Alle koblinger slettet");
}

// Når brukeren trykker ned musen
function mouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Høyreklikk: start å tegne en pil
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
    // Venstreklikk: dra boksen
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (
        mouseX > b.x && mouseX < b.x + b.w &&
        mouseY > b.y && mouseY < b.y + b.h
      ) {
        draggingBox = b;
        offsetX = mouseX - b.x;
        offsetY = mouseY - b.y;
        break;
      }
    }
  }
}

// Når musen beveges
function mouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Hvis vi tegner en pil
  if (connecting && startNode) {
    tempLineEnd = { x: mouseX, y: mouseY };
    draw();
    drawArrow(startNode.x + startNode.w / 2, startNode.y + startNode.h / 2, mouseX, mouseY);
    return;
  }

  // Vanlig flytting av bokser
  if (!draggingBox) return;
  draggingBox.x = mouseX - offsetX;
  draggingBox.y = mouseY - offsetY;
  draw();
}

// Når musen slippes
function mouseUp(e) {
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

        // Sjekk om koblingen finnes fra før
        if (!connections.some(c => c.fromId === newConn.fromId && c.toId === newConn.toId)) {
          connections.push(newConn);
          currentUserSolution.push([newConn.fromId, newConn.toId]);
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


//Midlertidig, løsning, trykk "n" for å gå til neste scenario, Delete for å slette connections.
document.addEventListener('keydown', (event) => {
    if(event.key == "n") {
        nextScenario();
    }
    if(event.key == 'Delete'){
      resetConnections();
    }
  
  });


//Laster neste scenario
function nextScenario(){
    if(model.game.currentScenario < model.ScenarioLevels.length-1){
        model.game.currentScenario += 1;
        boxes = processBoxes(); //henter nye bokser fra the nye scenariet.
        loadScenario(); //oppdaterer teksten i view
        draw(); //tegner opp alt på nytt, siden nytt scenario er hentet
    } else {
        //Om det ikke er flere scenario, lag en alert box
        //alert("Ikke flere scenarioer!");
        showLinkToQuiz();
        
    }
}

//Viser link til quiz, etter siste scenario
function showLinkToQuiz(){
    //Viser en alert box med link til quiz
    document.getElementById('scenarioTextHeader').innerHTML = /*html*/`
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">All scenarios completed. Click here to take the quiz.</a>
    
    
  
    
    `; 
}
//Midlertidig, funksjon for å teste løsning i console.
function testSolution(){
    console.log("Brukerens løsning: ", currentUserSolution,"\n\n Prøver å verifisere løsning...");
    verifySolution();
}



//Sjekker brukernes løsning mot alle riktige løsninger i modellen
function verifySolution() {
    let scenarioSolutions = model.ScenarioLevels[model.game.currentScenario].ScenarioSolution
    console.log("Loaded Scenario Solutions ", scenarioSolutions)
    
    // We go through all the Arrays (passenger scenarios) in the ScenarioSolutions, one by one
    for (let i = 0; i < scenarioSolutions.length; i++) {
        let passengerScenario = scenarioSolutions[i];
        console.log("current passenger scenario from the model ", passengerScenario)
      
      
        //For hver (.every) transition par ["x","y"] i "passenger solution array" [["x","y"],["x","z"]] i modellen (ScenarioSolutions)..
        let isMatch = passengerScenario.every(
        //..om et par er en del av (.some) brukerens løsning (array)
        (transitionPair) => currentUserSolution.some(
            //er denne (vi er i en for-løkke) passasjerens transition array lik NOEN av parene i currentUserSolution (ex. ["start", "end"]
            //for eksempel, "er det et tilfelle hvor "start" matcher "start" AND "end" matcher "end" 
            (userPair) => transitionPair[0] === userPair[0] && transitionPair[1] === userPair[1]
            )
        );
        //Finner vi en match i brukerens løsning, for hvert transition pair, i denne passasjerens array (model.ScenarioSolutions[0,1,2, etc])..
        if (isMatch) {
            console.log("Passenger "+(i+1)+" = "+"%c PASS", "color: green; font-size:18px;"); //Can maybe add a passenger description here? "Passenger with passport, no baggage"
        } 
        //om ikke...
        else {
            console.log("Passenger "+(i+1)+" = "+"%c FAIL", "color: red; font-size:18px;"); //Same here, so the user understands WHICH passenger failed?
        }
    }
}

