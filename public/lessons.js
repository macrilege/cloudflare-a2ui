import { renderSurface } from './renderer.js';
import { fordConfigurations } from './ford-configurations.js';
export const fordExampleUrl='https://www.ford.com/build-price/mustang/choose-model/build?configId=USAMustang2026&config=-3207239800454935606&trimConfig=3754605659390406444&vehicleTrim=ecoboostpremiumfastback&intcmp=nfbcChooseModel-cta-color-mustang#interior';
const text=(id,value,variant='body')=>({id,component:'Text',text:value,variant});
const column=(id,children)=>({id,component:'Column',children});
const card=(id,child)=>({id,component:'Card',child});
const check=(id,label,key)=>({id,component:'CheckBox',label,value:{path:`/${key}`}});
const field=(id,label,key)=>({id,component:'TextField',label,value:{path:`/${key}`},variant:'shortText'});
const button=(id,child,instruction)=>({id,component:'Button',child,variant:'primary',action:{event:{name:'refine',context:{instruction}}}});
export const lessons=[
  {
    name:"What is A2UI?",
    title:"Turn an AI answer into something you can use.",
    description:"Ask, “What kind of wheels are on the 2026 Mustang?” First read the text answer. Then reveal an answer you can interact with.",
    points:["The AI chooses what information and controls to show.","A2UI is the shared format it uses to describe those cards, fields, and buttons.","Your website reads that description and draws the answer in your site’s style."],
    connection:"A2UI carries a description of the cards and buttons. The website renders them in Ford colors. A button click tells the application which details you want next.",
    challenge:"Press “Show the interactive answer,” then “Explain these wheels” on either card. Watch the follow-up answer change. This is a ready-made demonstration with no AI calls.",
    question:"What does A2UI give the website?",
    options:["A description of what to display","A new vehicle database"],
    answer:0,
    feedback:"A2UI describes the screen. Vehicle facts still come from a trusted source, and the website displays the result.",
    doc:{components:[column('root',['title','intro','performance','bronze','followup']),text('title','Explore Mustang wheels','h2'),text('intro','Two 2026 Mustang GT package examples. Choose one to learn more.'),card('performance','performanceContent'),column('performanceContent',['performanceTitle','performanceDetail','performanceButton']),text('performanceTitle','GT Performance Package','h3'),text('performanceDetail','Carbonized Gray-painted aluminum\n19 × 9 in front · 19 × 9.5 in rear'),button('performanceButton','performanceLabel','Explain the GT Performance Package wheels.'),text('performanceLabel','Explain these wheels'),card('bronze','bronzeContent'),column('bronzeContent',['bronzeTitle','bronzeDetail','bronzeButton']),text('bronzeTitle','GT + Bronze Appearance Package','h3'),text('bronzeDetail','Sinister Bronze-painted wheels\nWheel widths depend on the Performance Package.'),button('bronzeButton','bronzeLabel','Explain the GT Bronze Appearance Package wheels.'),text('bronzeLabel','Explain these wheels'),card('followup','followupContent'),column('followupContent',['followupTitle','followupAnswer']),text('followupTitle','Your follow-up answer','h3'),text('followupAnswer',{path:'/answer'})],data:{answer:'Choose “Explain these wheels” on a card. Your answer will appear here.'}},
  },
  {
    name:"Cards & layouts",
    title:"Show wheel choices as clear cards.",
    description:"A shopper asks, “What kind of wheels are on the 2026 Mustang?” We group a few verified package examples into cards so the differences are easier to see.",
    points:["A “component” is one piece of the display, such as a card or a line of text.","A layout says whether the cards sit beside each other or in a vertical stack.","A “catalog” is the list of pieces your website supports. The AI works within that list."],
    connection:"A2UI describes the cards, their text, and their arrangement. Use the controls below to see how a different description changes the display.",
    challenge:"Choose a wheel package, then switch the layout. These are selected examples; the exact wheels depend on the Mustang’s trim and packages.",
    question:"In this example, what is a component?",
    options:["A piece of the display, such as a card","A mechanical part of the car"],
    answer:0,
    feedback:"Here, “component” means a piece of the user interface. A wheel card can contain several text components.",
    doc:{components:[column('root',['intro','choices']),text('intro','2026 Mustang: what kind of wheels?','h3'),column('choices',['truck','electric']),card('truck','truckText'),text('truckText','GT Performance Package\n19 × 9 in front\n19 × 9.5 in rear\nCarbonized Gray-painted aluminum'),card('electric','electricText'),text('electricText','GT + Bronze Appearance Package\n19 × 8.5 in without Performance Package\n19 × 9 front / 9.5 rear with Performance Package\nSinister Bronze-painted wheels')],data:{}},
  },
  {
    name:"Changing choices",
    title:"Change a value. See the screen follow.",
    description:"A shopper’s vehicle choice can change during a conversation. We connect the name field and the heading to the same value so they stay in sync.",
    points:["The vehicle name is the data. The field and heading are the display.","A “data binding” connects a display element to a value.","The browser can update that value immediately, without asking the AI again."],
    connection:"Both the heading and the input use the same vehicle name. This is A2UI data binding: the display follows the data.",
    challenge:"Type “2026 Mustang” in the vehicle field. The heading changes as you type. This changes the example’s label, not a real vehicle configuration.",
    question:"Does changing this vehicle name use an AI call?",
    options:["No—the browser updates it","Yes—AI has to rewrite the screen"],
    answer:0,
    feedback:"The browser handles this simple change. AI is needed when you want a new answer or a new interface.",
    doc:{components:[column('root',['vehicleTitle','vehicleInput','towing','note']),text('vehicleTitle',{path:'/vehicle'},'h2'),field('vehicleInput','Vehicle being discussed','vehicle'),check('towing','Ask about towing','towing'),text('note','Vehicle name is editable sample data, not an inventory lookup.','caption')],data:{vehicle:'2026 Ford Explorer',towing:false}},
  },
  {
    name:"Where AI fits",
    title:"AI understands the request. A2UI describes the display.",
    description:"When you press “Build my interface,” the application sends your request to its AI service. It asks the AI for an answer that can be displayed as cards and controls.",
    points:["The AI service produces the content and a description of the display.","The application checks that the description uses supported pieces, then sends A2UI messages to the browser.","Your website turns those messages into the answer you see. Ford facts must come from verified Ford information."],
    connection:"A2UI is the description passed to the website. Your application can create and check it using its chosen AI service and cloud environment.",
    challenge:"Follow the three boxes from top to bottom. Explain which part creates the answer and which part displays it. These boxes illustrate the flow; they do not call AI.",
    question:"Where should an exact vehicle’s towing rating come from?",
    options:["The AI’s best guess","Verified information for that vehicle"],
    answer:1,
    feedback:"Use verified vehicle information. A2UI helps display facts; it does not make a model’s guesses accurate.",
    doc:{components:[column('root',['request','service','output']),card('request','requestText'),text('requestText','01 · Shopper asks\n“What should I check before towing?”'),card('service','serviceText'),text('serviceText','02 · The application prepares the answer\nThe AI describes a useful display. The application checks it and sends it to the page.'),card('output','outputText'),text('outputText','03 · The website displays it\nThe shopper sees a checklist they can use.')],data:{}},
    code:`// Provider-neutral pseudocode.\n// Connect your chosen AI service behind this interface.\nconst answer = await aiService.generate({ messages });\nconst document = validateInterface(answer);\nreturn encodeA2UI(document);\n\n// Use trusted vehicle data for facts and configuration tokens.`,
  },
  {
    name:"Follow-up buttons",
    title:"Let the shopper ask the next question.",
    description:"A shopper wants to know whether a vehicle fits their needs. We give them a question field and a button, so their next request can include the choices they have already made.",
    points:["Clicking the button creates a small message called an “action.”","That message tells the application which button was clicked and what the shopper wants next.","The application decides how to respond. This example previews the message without sending it."],
    connection:"A2UI connects a displayed button to an action. Your application handles that action and can ask the AI for a follow-up answer.",
    challenge:"Edit the question and press “Preview follow-up.” Your question and selected interests are ready to travel together. Open the A2UI details if you want to see the message.",
    question:"What does an action tell the application?",
    options:["What the shopper clicked and wants to do","That a purchase has already happened"],
    answer:0,
    feedback:"An action describes a request. The application still has to perform the requested work and report the result.",
    doc:{components:[column('root',['title','question','towing','send']),text('title','Ask about this vehicle','h2'),field('question','Your follow-up question','question'),check('towing','Include towing requirements','towing'),button('send','sendText','Answer the shopper’s follow-up using verified vehicle data.'),text('sendText','Preview follow-up')],data:{question:'Which vehicle details should I verify for my camper?',towing:true}},
  },
  {
    name:"Build & Price",
    title:"Choose real options. Open the matching Ford build.",
    description:"These five 2026 Mustang EcoBoost Premium and GT V8 builds were checked in Ford’s configurator. Try a different color or wheel setup and see the matching Build & Price link change.",
    points:["Ford supplies the valid choices and configuration tokens. A2UI presents them as cards and buttons.","Some choices affect other options: Ford required removing RTR and MagneRide for this 20-inch wheel build.","Selecting a card updates the summary and uses the exact link captured from Ford. These are five verified builds, not every possible combination."],
    connection:"The cards and selection buttons come from an A2UI description. Clicking a button creates an action; this application selects the corresponding verified Ford build and updates the display and link.",
    challenge:"Choose “Use Vapor Blue + 20-inch wheels.” Read what changes, then open Ford Build & Price. The link carries that build’s real configuration token.",
    question:"Where should the configuration token come from?",
    options:["Ford’s configuration system","A token invented by the AI"],
    answer:0,
    feedback:"Keep the token supplied by Ford. It is an identifier, so even a small change could point to a different setup or break the link.",
    doc:{components:[column('root',['title','note',...fordConfigurations.map(c=>c.id),'selected']),text('title','2026 Mustang · EcoBoost & V8 builds','h2'),text('note','REAL FORD OPTIONS · CHECKED OCT 3, 2026','caption'),...fordConfigurations.flatMap(c=>[card(c.id,`${c.id}-content`),column(`${c.id}-content`,[`${c.id}-title`,`${c.id}-details`,`${c.id}-button`]),text(`${c.id}-title`,c.name,'h3'),text(`${c.id}-details`,`${c.model}\n${c.wheels}\n${c.details}`),button(`${c.id}-button`,`${c.id}-label`,`Select verified build: ${c.id}`),text(`${c.id}-label`,`Use ${c.name}`)]),card('selected','selected-content'),column('selected-content',['selected-title','selected-name','selected-details']),text('selected-title','Selected build','h3'),text('selected-name',{path:'/selected'},'h3'),text('selected-details',{path:'/details'})],data:{selected:fordConfigurations[0].name,details:fordConfigurations[0].change}},
  },
  {
    name:"Try it live",
    title:"Now let the AI create a vehicle answer.",
    description:"The earlier examples were ready-made teaching examples. Here you can ask AI to create a new Explorer card, with interests to select and a follow-up question field.",
    points:["Send the prompt to the builder, then press “Build my interface.”","Try the controls in the answer. They come from the AI’s A2UI description.","The lessons use no AI calls. Building a new answer uses one of the demo’s daily generations."],
    connection:"This is the complete loop: your prompt → AI → checked A2UI description → interactive answer in the browser.",
    challenge:"Use the prompt below. In the builder, generate an answer, change a preference, and use its follow-up button. The optional JSON tab shows the description behind the screen.",
    question:"What makes the generated answer an A2UI example?",
    options:["AI describes UI pieces that the website displays","It mentions artificial intelligence"],
    answer:0,
    feedback:"The key is the structured description of the interface. The website reads it to build cards and controls.",
    doc:{components:[column('root',['title','prompt','launch']),text('title','Your next experiment','h2'),card('prompt','promptText'),text('promptText','Create a 2026 Ford Explorer shopping assistant card. Include a checklist for towing, seating, and budget questions; a field for the shopper’s needs; and a follow-up button. Do not invent prices, inventory, or specifications.'),button('launch','launchText','Open the live builder'),text('launchText','Use this prompt in the builder')],data:{}},
  }
];
export function buildPriceLink(value){
  const original=value.trim();
  try{const url=new URL(original);if(url.protocol!=='https:'||!['ford.com','www.ford.com'].includes(url.hostname)||url.username||url.password||url.port||!url.pathname.startsWith('/build-price/'))return null;
    if(!['config','configToken','configurationToken'].some(key=>url.searchParams.get(key)?.trim()))return null;
    return original;
  }catch{return null;}
}
export function initLessons(openBuilder){
  const $=s=>document.querySelector(s);
  let index=location.hash==='#build-price'?5:0;let revealed=false;let buildPriceUrl=fordExampleUrl;const documents=lessons.map(l=>structuredClone(l.doc));const answers=new Map();const events=new Map();
  function currentDocument(){
    const source=documents[index],nodes=new Map(source.components.map(c=>[c.id,c])),visible=new Set();
    function visit(id){if(visible.has(id))return;visible.add(id);const c=nodes.get(id);if(c.children)c.children.forEach(visit);if(c.child)visit(c.child);}
    visit('root');return {...source,components:source.components.filter(c=>visible.has(c.id))};
  }
  function code(){const lesson=lessons[index];let content;
    if(events.has(index))content=JSON.stringify(events.get(index),null,2);
    else if(index===5)content=JSON.stringify({component:'Button',id:'build-price-button',child:'build-price-label',action:{event:{name:'open_build_price',context:{url:{path:'/buildPriceUrl'}}}}},null,2);
    else if(lesson.code)content=lesson.code;
    else if(index===2)content=JSON.stringify({boundComponents:documents[index].components.filter(c=>('value' in c)||(c.component==='Text'&&typeof c.text!=='string')),data:documents[index].data},null,2);
    else content=JSON.stringify({version:'v0.9',updateComponents:{surfaceId:'vehicle-lesson',components:currentDocument().components}},null,2);
    $('#lesson-code').textContent=content;
  }
  function paint(focus=false){
    const lesson=lessons[index];$('#lesson-kicker').textContent=`${String(index+1).padStart(2,'0')} / FORD AI CHAT · A2UI EXPLAINED`;
    $('#lesson-title').textContent=lesson.title;$('#lesson-connection').textContent=lesson.connection;$('#lesson-description').textContent=lesson.description;$('#lesson-challenge').textContent=lesson.challenge;
    $('#lesson-points').replaceChildren(...lesson.points.map(p=>{const li=document.createElement('li');li.textContent=p;return li;}));
    $('#quiz-question').textContent=lesson.question;$('#quiz-feedback').textContent='';
    $('#quiz-options').replaceChildren(...lesson.options.map((option,n)=>{const b=document.createElement('button');b.textContent=option;b.className='quiz-option';b.onclick=()=>{answers.set(index,n);feedback();};return b;}));
    function feedback(){const answer=answers.get(index);if(answer===undefined)return;$('#quiz-feedback').textContent=`${answer===lesson.answer?'Exactly.':'Not quite.'} ${lesson.feedback}`;[...$('#quiz-options').children].forEach((b,n)=>{b.setAttribute('aria-pressed',String(n===answer));b.classList.toggle('correct',n===answer&&answer===lesson.answer);b.classList.toggle('incorrect',n===answer&&answer!==lesson.answer);});}
    feedback();
    renderSurface($('#lesson-demo'),currentDocument(),{onDataChange:()=>{events.delete(index);code();},onAction:c=>{
      if(index===6){openBuilder(documents[index].components.find(c=>c.id==='promptText').text);return;}
      const event={version:'v0.9',action:{name:c.action.event.name,surfaceId:'vehicle-lesson',sourceComponentId:c.id,timestamp:new Date().toISOString(),context:c.action.event.context}};
      if(index===5){
        const selected=fordConfigurations.find(build=>`${build.id}-button`===c.id);if(!selected)return;
        buildPriceUrl=selected.url;documents[5].data.selected=selected.name;documents[5].data.details=selected.change;paint();
        events.set(5,{selectionAction:event,updatedData:{selected:selected.name,details:selected.change,buildPriceUrl:selected.url}});code();
        $('#demo-status').textContent=`Selected ${selected.name}. The summary and Ford link now match this verified build.`;
        $('#demo-controls').querySelector('a').focus({preventScroll:true});$('#demo-controls').scrollIntoView({block:'nearest',behavior:'smooth'});return;
      }
      if(index===0){
        const answer=c.id==='performanceButton'?'GT Performance Package: the front wheels are 19 × 9 inches and the rear wheels are 19 × 9.5 inches. Both are Carbonized Gray-painted aluminum. The rear wheels are wider.':'GT + Bronze Appearance Package: Sinister Bronze-painted wheels are 19 × 8.5 inches without the GT Performance Package. With it, they are 19 × 9 inches in front and 19 × 9.5 inches in the rear.';
        documents[0].data.answer=answer;
        events.set(0,{event,exampleResponse:{version:'v0.9',updateDataModel:{surfaceId:'vehicle-lesson',path:'/answer',value:answer}}});
        paint();$('#demo-status').textContent='You clicked a button → the application received an action → the answer updated. This demonstration uses a prepared response; a live assistant could ask AI for the follow-up.';
        $('#lesson-demo').querySelector('.a-card:last-child').scrollIntoView({block:'nearest',behavior:'smooth'});return;
      }
      events.set(index,{event,previous:documents[index]});code();$('#demo-status').textContent='Your question and choices are ready for a follow-up. This is a preview: nothing was sent. Use “Show A2UI details” to see the message.';
    }});
    $('#demo-controls').replaceChildren();$('#demo-status').textContent='';$('#code-label').textContent=index===2?'COMPONENT BINDINGS + CURRENT DATA':index===4?'CLIENT → SERVER REQUEST PREVIEW':index===5?'BUTTON ACTION / CONFIGURATION HANDOFF':index===3?'SIMPLIFIED SERVER CODE':'A2UI COMPONENT MESSAGE';
    $('#purpose-intro').hidden=index!==0;$('#purpose-text').hidden=revealed;$('#lesson-demo').hidden=index===0&&!revealed;
    if(index===0){
      const reveal=document.createElement('button');reveal.className='a-button primary';reveal.textContent=revealed?'Replay demonstration ↺':'Show the interactive answer →';
      reveal.onclick=()=>{revealed=!revealed;if(!revealed){documents[0]=structuredClone(lessons[0].doc);events.delete(0);}paint();$('#demo-controls button').focus({preventScroll:true});};$('#demo-controls').append(reveal);
      if(revealed){const next=document.createElement('button');next.className='outline-button';next.textContent='Next: a Build & Price example →';next.onclick=()=>{index=5;paint(true);$('#lesson-title').scrollIntoView({block:'start'});};$('#demo-controls').append(next);}
    }
    if(index===1){const toggle=document.createElement('button');toggle.className='outline-button';const layout=documents[index].components.find(c=>c.id==='choices');toggle.textContent=layout.component==='Column'?'Arrange side by side →':'Stack vertically ↓';toggle.onclick=()=>{layout.component=layout.component==='Column'?'Row':'Column';paint();};$('#demo-controls').append(toggle);
      const label=document.createElement('label');label.className='wheel-picker';label.textContent='Show wheel details for';const select=document.createElement('select');select.setAttribute('aria-label','Mustang wheel configuration');
      for(const [value,title] of [['both','Compare selected examples'],['truck','GT Performance Package'],['electric','GT + Bronze Appearance Package']]){const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option);}
      select.value=layout.children.length===2?'both':layout.children[0];select.onchange=()=>{layout.children=select.value==='both'?['truck','electric']:[select.value];paint();};label.append(select);$('#demo-controls').append(label);
    }
    if(index===5){
      const label=document.createElement('label');label.className='a-field';label.textContent='Ford Build & Price URL with config token';
      const input=document.createElement('input');input.type='url';input.placeholder='Paste the complete Ford configuration URL';input.value=buildPriceUrl;input.maxLength=8000;input.autocomplete='off';input.spellcheck=false;
      const link=document.createElement('a');link.className='a-button primary build-price-link';link.textContent='Open Ford Build & Price ↗';link.target='_blank';link.rel='noopener noreferrer';
      const hint=document.createElement('p');hint.className='handoff-hint';hint.setAttribute('role','status');
      const pricing=document.createElement('p');pricing.className='handoff-hint';pricing.textContent='Option prices were displayed by Ford on October 3, 2026. They are not a total vehicle price. Ford confirms current pricing and availability when you open the build.';
      function preview(){
        buildPriceUrl=input.value;const url=buildPriceLink(buildPriceUrl);
        if(url){link.href=url;link.removeAttribute('aria-disabled');link.tabIndex=0;const known=fordConfigurations.find(c=>c.url===url);hint.textContent=known?`Opens ${known.name}. Ford’s full configuration link is preserved.`:'Custom Ford link. The cards above describe the captured examples, not this custom configuration.';events.set(index,{version:'v0.9',action:{name:'open_build_price',surfaceId:'vehicle-lesson',sourceComponentId:'build-price-button',timestamp:new Date().toISOString(),context:{url}}});}
        else{link.removeAttribute('href');link.setAttribute('aria-disabled','true');link.tabIndex=-1;hint.textContent=buildPriceUrl?'Use an HTTPS ford.com/build-price/ URL containing a config, configToken, or configurationToken parameter.':'Paste a link from Ford’s configuration system to enable the button.';events.delete(index);}
        code();
      }
      input.oninput=preview;label.append(input);$('#demo-controls').append(link,hint,pricing,label);preview();
    }
    code();$('#lesson-progress').textContent=`${index+1} of ${lessons.length}`;$('#lesson-back').disabled=index===0;$('#lesson-next').textContent=index===lessons.length-1?'Start again ↺':'Next →';
    [...$('#lesson-steps').children].forEach((b,n)=>{b.setAttribute('aria-current',n===index?'step':'false');});
    if(focus)$('#lesson-title').focus({preventScroll:true});
  }
  $('#lesson-steps').replaceChildren(...lessons.map((l,n)=>{const b=document.createElement('button');b.textContent=`${n+1}. ${l.name}`;b.onclick=()=>{index=n;paint(true);};return b;}));
  $('#lesson-back').onclick=()=>{if(index>0){index--;paint(true);}};$('#lesson-next').onclick=()=>{index=(index+1)%lessons.length;paint(true);};
  $('#toggle-code').onclick=()=>{const hidden=!$('#lesson-code').hidden;$('#lesson-code').hidden=hidden;$('#toggle-code').textContent=hidden?'Show A2UI details':'Hide A2UI details';$('#toggle-code').setAttribute('aria-expanded',String(!hidden));};
  function present(value){document.body.classList.toggle('presenting',value);$('#present').textContent=value?'Exit presentation ×':'Present ↗';$('#present').setAttribute('aria-pressed',String(value));if(value)window.scrollTo({top:0});}
  $('#present').onclick=()=>present(!document.body.classList.contains('presenting'));
  document.addEventListener('keydown',e=>{if($('#lesson-view').hidden||e.target.closest('input,textarea,select,button,a,[contenteditable]'))return;if(e.key==='ArrowRight'){e.preventDefault();$('#lesson-next').click();}if(e.key==='ArrowLeft'){e.preventDefault();$('#lesson-back').click();}if(e.key==='Escape')present(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')present(false);});
  paint();
}
