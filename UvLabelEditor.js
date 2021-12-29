const ElementName = `uv-label-editor`;

export default ElementName; 

export class UvLabelEditor extends HTMLElement 
{
	constructor()
	{
		super();
		
		this.onchanged = function()
		{
			console.log(`${this.ElementName()} changed`);
		};
	}
	
	static ElementName()
	{
		return ElementName;
	}
	ElementName()
	{
		return UvLabelEditor.ElementName();
	}
	
	static get observedAttributes() 
	{
		return ['labels','css'];
	}
	
	//	get labels attribute as object
	get labels()			
	{
		try
		{
			let Value = this.getAttribute('labels');
			return JSON.parse(Value);
		}
		catch(e)
		{
			return {};
		}
	}
	//	todo: detect setting an object
	set labels(Value)	
	{
		if ( typeof Value != typeof '' )
			Value = JSON.stringify(Value);
		
		const OldValue = this.getAttribute('labels');
		if ( OldValue ==  Value )
			return;
			
		this.setAttribute('labels', Value);
		this.onchanged();	
	}
	
	get css()			{	return this.getAttribute('css');	}
	set css(Css)		{	Css ? this.setAttribute('css', Css) : this.removeAttribute('css');	}
	

	SetupDom(Parent)
	{
		this.RootElement = document.createElement('div');
		this.RootElement.className = this.ElementName();
		
		this.Style = document.createElement('style');
		
		// attach the created elements to the shadow dom
		Parent.appendChild(this.Style);
		Parent.appendChild(this.RootElement);
	}
	
	GetCssContent()
	{
		const ImportCss = this.css ? `@import "${this.css}";` : '';
		const Css = `
		${ImportCss}
		
		:host
		{
			background-size: 100% 100% !important;
			overflow:		hidden;
		}
		
		/* root container */
		.${this.ElementName()}
		{
			position:	relative;
			width:		100%;
			height:		100%;
			xxbackground:	yellow;
			
		}
		
		.Label
		{
			--u:	0.5;
			--v:	0.5;
			position:	absolute;
			left:		calc( var(--u)*100% );
			top:		calc( var(--v)*100% );/*gr: is this 100% of width, not height?*/
			width:		10px;
			height:		10px;
			border:		1px solid black;
			transform:	translate(-5px,-5px);
		}
		.Label:after
		{
			content:	attr(label);
			display:	block;
			transform:	translate(14px,0px);
		}
		`;
		return Css;
	}
	
	attributeChangedCallback(name, oldValue, newValue) 
	{
		if ( name == 'labels' )
			this.UpdateLabels();
		
		if ( this.Style )
			this.Style.textContent = this.GetCssContent();
	}
	
	connectedCallback()
	{
		//	Create a shadow root
		this.Shadow = this.attachShadow({mode: 'open'});
		this.SetupDom(this.Shadow);
		this.attributeChangedCallback();
	}
	
	get TreeContainer()	{	return this.RootElement;	}

	get TreeChildren()
	{
		let Children = Array.from( this.TreeContainer.children );
		Children = Children.filter( e => e instanceof TreeNodeElement || e instanceof HTMLDivElement );
		return Children;
	}
	
	UpdateLabel(Key)
	{
		const Element = this.GetLabelElement(Key);
		const Value = this.labels[Key];
		
		const u = Value[0];
		const v = Value[1];
		Element.setAttribute('label',Key);
		Element.setAttribute('u',u);
		Element.setAttribute('v',v);
		Element.style.setProperty('--u', u );
		Element.style.setProperty('--v', v );
	}
	
	SetupTreeNodeElement(Element,Address,Value,Meta)
	{
		/*
		//	we will have a collapsable children
		const ValueIsChild = Meta.ValueIsChild;
		const Key = Address[Address.length-1];
		const Indent = Address.length-1;
		
		//	for convinence, put all properties as attributes so we can easily style stuff in css
		if ( typeof Value == typeof {} )
		{
			for ( let [PropertyKey,PropertyValue] of Object.entries(Value) )
			{
				//	not all attributes names are allowed
				//	must start with a-zA-Z etc
				
				//	todo regex when this needs to get more complicated
				//	try and avoid throwing to help debugging
				if ( PropertyKey.length == 0 )
					continue;
				const KeyNumber = Number(PropertyKey[0]);
				const KeyStartsWithNumber = !isNaN(KeyNumber);
				if ( KeyStartsWithNumber )
					continue;
					
				try
				{
					Element.setAttribute(PropertyKey,PropertyValue);
				}
				catch{};
			}
		}
		
		//	set css variable
		Element.Address = Address;
		Element.Key = Key;
		Element.Value = Value;
		Element.style.setProperty(`--Indent`,Indent);
		Element.style.setProperty(`--Key`,Key);
		Element.style.setProperty(`--Value`,Value);
		Element.Droppable = Meta.Droppable;
		
		if ( Meta.Draggable )
			Element.setAttribute('Draggable',true);
		if ( Meta.Droppable )
			Element.setAttribute('Droppable',true);
		if ( Meta.Selected )
			Element.setAttribute('Selected',true);
			
		//	on ios its a css choice
		//	gr: not required https://stackoverflow.com/questions/6600950/native-html5-drag-and-drop-in-mobile-safari-ipad-ipod-iphone
		Element.style.setProperty('webkitUserDrag','element');
		Element.style.setProperty('webkitUserDrop','element');
		
		
		function OnDragOver(Event)
		{
			let CanDrop = Element.Droppable;

			//	let dragover propogate
			if ( !CanDrop )
				return;
			
			//	continuously called
			//console.log(`OnDragOver ${Key}`);
			Element.setAttribute('DragOver',true);
			Event.stopPropagation();
			Event.preventDefault();	//	ios to accept drop
			
			//	seems to default to copy if you dont set this
			//	ios has no link icon, nothing has move icon
			//Event.dataTransfer.dropEffect = 'copy';
			//	copy then link here, drop will fail, but using link to get icon on desktop
			Event.dataTransfer.dropEffect = 'link';
			//Event.dataTransfer.dropEffect = 'move';
			//return true;
		}
		function OnDragLeave(Event)
		{
			//console.log(`OnDragLeave ${Key}`);
			Element.removeAttribute('DragOver');
		}
		function OnDrop(Event)
		{
			console.log(`OnDrop ${Key}`,Element);
			let CanDrop = Element.Droppable;
			//	let dragover propogate
			if ( !CanDrop )
				return;
				
			Element.removeAttribute('DragOver');
			Event.preventDefault();
			Event.stopPropagation();	//	dont need to pass to parent
			
			//	move source object to dropped object
			const OldAddress = JSON.parse(Event.dataTransfer.getData('text/plain'));
			const NewAddress = Element.Address;
			this.MoveData(OldAddress,NewAddress);
		}
		
		function OnDragStart(Event)
		{
			//console.log(`OnDragStart ${Key}`);
			//Event.dataTransfer.effectAllowed = 'all';
			Event.dataTransfer.dropEffect = 'link';	//	copy move link none
			Event.dataTransfer.setData('text/plain', JSON.stringify(Address) );
			
			Event.stopPropagation();	//	stops multiple objects being dragged
			//Event.preventDefault();	//	this stops drag entirely
			//return true;//	not required?
		}
		
		function OnDragEnd(Event)
		{
			//console.log(`OnDragEnd ${Key}`);
			Element.removeAttribute('DragOver');			
			
			//	dont need to tell parent
			Event.stopPropagation();
		}
		
		function OnDrag(Event)
		{
			//	continuously called
			//console.log(`OnDrag`);
		}
		function OnDragEnter(Event)
		{
			let CanDrop = Element.Droppable;
			if ( !CanDrop )
				return;
			//console.log(`OnDragEnter ${Key}`);
			//	this to allow this as a drop target
			Event.preventDefault();
			return true;
		}
		
		Element.addEventListener('dragstart',OnDragStart);
		Element.addEventListener('dragenter',OnDragEnter);
		Element.addEventListener('drag',OnDrag);	//	would be good to allow temporary effects
		Element.addEventListener('dragend',OnDragEnd);

		Element.addEventListener('drop',OnDrop.bind(this));
		Element.addEventListener('dragover',OnDragOver);
		Element.addEventListener('dragleave',OnDragLeave);
		
		Element.onclick = function(Event)
		{
			const AppendSelect = Event.shiftKey;
			this.ToggleSelected( [Element],AppendSelect);

			Event.stopPropagation();
			Event.preventDefault();
		}.bind(this);
		
		//	toggle collapsable
		//	attribute only exists on collapsable objects
		if ( ValueIsChild )
		{
			Element.setAttribute('Collapsed',Meta.Collapsed==true);
		}
		
		if ( ValueIsChild )
		{
			let Collapser = document.createElement('button');
			Collapser.className = 'Collapser';
			Element.appendChild(Collapser);	
			
			Collapser.onclick = function(Event)
			{
				let Collapsed = Element.getAttribute('Collapsed') == 'true';
				Collapsed = !Collapsed;
				Element.setAttribute('Collapsed',Collapsed);
				Event.stopPropagation();
			}
		}
		
		
		let Label = Key;
		if ( Meta.KeyAsLabel )
			Label = Value[Meta.KeyAsLabel];
		let LabelElement = document.createElement('label');
		LabelElement.innerText = Label;
		Element.appendChild(LabelElement);	
		
		if ( !ValueIsChild )
		{
			let ValueElement = document.createElement('span');
			ValueElement.innertText = Value;
			Element.appendChild(ValueElement);	
		}
		*/
	}

	GetLabelElement(Key)
	{
		const Children = Array.from( this.TreeContainer.children );
		
		let Child = Children.find( e => e.id == Key );
		if ( Child )
			return Child;
			
		Child = document.createElement('div');
		Child.id = Key;
		Child.className = 'Label';
		this.TreeContainer.appendChild(Child);
		return Child;
	}
	
	GetLabelElements()
	{
		const Children = Array.from( this.TreeContainer.children );
		return Children;
	}
	
	RemoveLabelElement(Key)
	{
		const Children = Array.from( this.TreeContainer.children );
		let Child = Children.find( e => e.id == Key );
		if ( !Child )
			return false;
		
		this.TreeContainer.removeChild(Child);
		return Child;
	}

	UpdateLabels()
	{
		//	no DOM yet
		if ( !this.TreeContainer )
			return;
			
		const Labels = this.labels;
		const LabelKeys = Object.keys(Labels);
		
		//	remove any labels that are no longer referenced
		const LabelElements = this.GetLabelElements();
		const RemovedLabelKeys = LabelElements.filter( e => !LabelKeys.any( k => e.id == k ) ).map( e => e.id );
		RemovedLabelKeys.forEach( Key => this.RemoveLabelElement.call( this, Key ) );
		
		LabelKeys.forEach( this.UpdateLabel.bind(this) );
	}
}

//	name requires dash!
window.customElements.define( UvLabelEditor.ElementName(), UvLabelEditor );

