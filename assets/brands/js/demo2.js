(function(){

	var button = document.getElementById('cn-button'),
    wrapper = document.getElementById('cn-wrapper');

    //open and close menu when the button is clicked
	var open = false;
	// Translated via app.js when it is loaded (it is on every page that uses this menu)
	function label(key){
	  return typeof i18n !== "undefined" ? i18n.t(key) : key;
	}
	button.addEventListener('click', handler, false);

	function handler(){
	  if(!open){
	    this.textContent = label("Close");
	    classie.add(wrapper, 'opened-nav');
	  }
	  else{
	    this.textContent = label("Menu");
		classie.remove(wrapper, 'opened-nav');
	  }
	  open = !open;
	}
	function closeWrapper(){
		classie.remove(wrapper, 'opened-nav');
	}

})();
