/**
* @description Enables asmooth scrolling for anchor links
*/
$(document).on('click', 'a[href^="#"]', function (event) {
    event.preventDefault();

    $('html, body').animate({
        scrollTop: $($.attr(this, 'href')).offset().top
    }, 500);
});

/**
* @description Checks/Changes the size of the map in case of resizing the window
*/
$( window ).resize(function() {
    if($('.information').css('display').localeCompare('block') === 0) {
        if ($(window).width() >= 992)
            $('#map').css('width', 'calc(100vw - 300px)');
        else
            $('#map').css('width', '100vw');
    }
});

/**
* @description Toggles the sidebar. 
*/
function toggleSidebar() {
    var w1 = 0;
    var w2 = 300;
    
    if($('aside').width() == w1) {
        $('aside').width(w2);
        $('header').css('padding-left', w2); 
        
        if($( window ).width() < 576) {
            $('h1').css('display', 'none');
            $('h2').css('display', 'none');
        }
            
    } else {
        $('aside').width(w1);
        $('header').css('padding-left', w1);
        $('h1').css('display', 'block');
        $('h2').css('display', 'block');
    }
}