// Shared by the live generator and the teaching examples.
export function renderSurface(container, document, {onAction=()=>{},onDataChange=()=>{},choicePresentation=()=>undefined}={}) {
  const nodes=new Map(document.components.map(c=>[c.id,c]));
  const boundText=new Map();
  function update(path,value,component){
    document.data[path.slice(1)]=value;
    for(const el of boundText.get(path)||[])el.textContent=String(value);
    onDataChange(document.data,{path,value,component});
  }
  function build(id){
    const c=nodes.get(id);let el;
    if(c.component==='Text'){
      const tag=/^h[1-5]$/.test(c.variant)?c.variant:'p';el=window.document.createElement(tag);el.className=`a-text a-${c.variant||'body'}`;
      if(typeof c.text==='string')el.textContent=c.text;
      else{el.textContent=document.data[c.text.path.slice(1)];const list=boundText.get(c.text.path)||[];list.push(el);boundText.set(c.text.path,list);}
    }
    else if(c.component==='Column'||c.component==='Row'){el=window.document.createElement('div');el.className=`a-${c.component.toLowerCase()}`;el.append(...c.children.map(build));}
    else if(c.component==='Card'){el=window.document.createElement('div');el.className='a-card';el.append(build(c.child));}
    else if(c.component==='Divider')el=window.document.createElement('hr');
    else if(c.component==='CheckBox'){el=window.document.createElement('label');el.className='a-check';const input=window.document.createElement('input');input.type='checkbox';input.checked=document.data[c.value.path.slice(1)];input.onchange=()=>update(c.value.path,input.checked,c);const label=window.document.createElement('span');label.textContent=c.label;el.append(input,label);}
    else if(c.component==='TextField'){el=window.document.createElement('label');el.className='a-field';const label=window.document.createElement('span');label.textContent=c.label;const input=window.document.createElement(c.variant==='longText'?'textarea':'input');input.value=document.data[c.value.path.slice(1)];input.maxLength=600;input.placeholder='Type something…';input.oninput=()=>update(c.value.path,input.value,c);el.append(label,input);}
    else if(c.component==='ChoicePicker'&&choicePresentation(c,document.data)){
      const presentation=choicePresentation(c,document.data),current=document.data[c.value.path.slice(1)][0]||'';
      el=window.document.createElement('fieldset');el.className=`a-visual-choice ${presentation.kind}`;el.id=`choice-${c.id}`;
      const legend=window.document.createElement('legend');legend.textContent=c.label;el.append(legend);
      const list=window.document.createElement('div');list.className='visual-choice-options';
      for(const option of c.options){
        const details=presentation.items[option.value]||{},label=window.document.createElement('label');label.className='visual-choice-option';
        const input=window.document.createElement('input');input.type='radio';input.name=c.id;input.value=option.value;input.checked=current===option.value;input.setAttribute('aria-label',option.label);
        input.disabled=Boolean(details.disabled);if(input.disabled)input.dataset.unavailable='true';
        input.onchange=()=>{if(!input.disabled&&input.checked)update(c.value.path,[option.value],c);};
        const content=window.document.createElement('span');content.className='visual-choice-content';
        if(details.image){const img=window.document.createElement('img');img.src=details.image;img.alt=details.title;img.width=350;img.height=197;img.decoding='async';content.append(img);}
        if(details.swatch){const swatch=window.document.createElement('span');swatch.className=`paint-swatch ${details.swatch}`;swatch.setAttribute('aria-hidden','true');content.append(swatch);}
        const text=window.document.createElement('span');text.className='visual-choice-text';const title=window.document.createElement('strong');title.textContent=details.title||option.label;text.append(title);
        if(details.note){const note=window.document.createElement('small');note.textContent=details.note;text.append(note);}
        const checked=window.document.createElement('span');checked.className='visual-selected';checked.textContent='Selected';checked.setAttribute('aria-hidden','true');
        content.append(text,checked);label.append(input,content);list.append(label);
      }
      el.append(list);
      if(current&&!c.options.some(o=>o.value===current)){const note=window.document.createElement('p');note.textContent=`${current} — choose an available option`;el.append(note);}
    }
    else if(c.component==='ChoicePicker'){
      el=window.document.createElement('label');el.className='a-choice';
      const label=window.document.createElement('span');label.textContent=c.label;
      const select=window.document.createElement('select');select.id=`choice-${c.id}`;
      const current=document.data[c.value.path.slice(1)][0]||'';
      const placeholder=window.document.createElement('option');placeholder.value='';placeholder.textContent=`Choose ${c.label.toLowerCase()}`;placeholder.disabled=true;select.append(placeholder);
      for(const option of c.options){const item=window.document.createElement('option');item.value=option.value;item.textContent=option.label;select.append(item);}
      if(current&&!c.options.some(option=>option.value===current)){
        const unavailable=window.document.createElement('option');unavailable.value=current;unavailable.textContent=`${current} — choose an available option`;unavailable.disabled=true;select.append(unavailable);
      }
      select.value=current;
      select.onchange=()=>update(c.value.path,[select.value],c);
      el.append(label,select);
    }
    else if(c.component==='Button'){el=window.document.createElement('button');el.type='button';el.className=`a-button ${c.variant||''}`;el.append(build(c.child));el.onclick=()=>onAction(c,document);}
    if(!el)throw new Error('Unsupported component');el.dataset.componentId=c.id;return el;
  }
  container.replaceChildren(build('root'));
}
