//Globale vars
let canvas = null;
let context = null;
let boxes = [];
//mellomlagrer brukerens løsning. I denne foreløpige løsningen, lagres KUN transitions mellom bokser.
let currentUserSolution = [["start","task1"],["start", "task2"],["task2","task1"],["task1","end"]]; 


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
    //Vi bruker "currentScenario" som en "level teller". Scenario 0 referer da til både første scenario, og index 0 i listen av scenarioer
    let boxes = model.ScenarioLevels[model.game.currentScenario].BoxesList; 
    let nextXpos = 0;
    for (let i = 0; i < boxes.length; i++) {
        //Bruker bredden på forrige boks (om denne boksen ikke er index 0), for å regne ut neste x posisjon, pluss litt padding, sprer boksene
        (i == 0) ? nextXpos +=20 : nextXpos += boxes[i-1].w+20; //Forenklet if statement, "om i er 0, så legg til 20, ellers legg til bredden på forrige boks + 20px"
        boxes[i].x = nextXpos 
        } 
        console.log("Boxes processed: ", boxes);
    return boxes;
}

//Globale variabler som brukes til å holde styr på hvilken boks som dras, og offset for å få riktig posisjon
let draggingBox = null;
let offsetX = 0;
let offsetY = 0;

//Sletter canvas, og tegner opp alt på nytt. Kalles hovedsakelig når musen flyttes (mouseMove())
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    //Går gjennom alle boksene i array, og tegner dem
    for (let box of boxes) {
        // Tegner boksen først
        console.log("Drawing box at "+box.x+","+box.y);
        context.fillStyle = box.color;
        context.fillRect(box.x, box.y, box.w, box.h);
        
        //..så teksten, ellers havner teksten under boksen, kanskje legge dette i CSS?
        context.fillStyle = "black";
        context.font = "14px Arial";  
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(box.text, box.x + box.w / 2, box.y + box.h / 2); //Teksten i midten av boksen
  }
}

//Når brukeren trykker ned musen...
function mouseDown(e) {
    const rect = canvas.getBoundingClientRect(); //Finner posisjon av canvas i forhold til vinduet
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    console.log(rect);
    

  // Sjekker om brukeren klikker "innenfor" en boks, kanskje det finns en bedre måte?
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (
            mouseX > b.x &&
            mouseX < b.x + b.w &&
            mouseY > b.y &&
            mouseY < b.y + b.h
        ) 
      {
        //Nå riktig boks, i listen av alle boksene i dette scenarioet er funnet, settes dette "draggingBox"
        draggingBox = b;
        console.log("Started dragging box: ", b);
        //får riktig posisjon på boksen i forhold til musen, sånn at musen holder seg der man trykket, og ikke på 0,0 ift boks (kosmetisk)
        offsetX = mouseX - b.x;
        offsetY = mouseY - b.y;
        break;
      }
  }
};

//Hver gang musen flyttes, og en boks er "dragging", oppdateres posisjonen til boksen
function mouseMove(e) {
  if (!draggingBox) return;// om ingen boks skal dras, gjør ingenting
  
  const rect = canvas.getBoundingClientRect();  //igjen, posisjon av canvas ift vindu
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  draggingBox.x = mouseX - offsetX;
  draggingBox.y = mouseY - offsetY;

  draw(); //Tegn opp alt på nytt, for hver pixl musen flyttes
};

//Disse to kansellerer dragging når musen slippes eller utenfor canvas
function mouseUp(e) {
  draggingBox = null;
};

function mouseLeave(e) {
  draggingBox = null;
};


//Midlertidig, løsning, trykk "n" for å gå til neste scenario
document.addEventListener('keydown', (event) => {
    if (event.key === "n") {
        nextScenario();
    }});


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