// Smooth scrolling for anchor link
$(document).on('click', 'a[href^="#"]', function (event) {
    event.preventDefault();

    $('html, body').animate({
        scrollTop: $($.attr(this, 'href')).offset().top
    }, 500);
});

function toggleNav() {
    var w1 = 0;
    var w2 = 300;
    
    console.log($("aside").width());
    if($("aside").width() == w1) {
        $("aside").width(w2);
        $("header").css("padding-left", w2); 
        
        if($( window ).width() < 576)
            $("h1").css("display", "none");
    } else {
        $("aside").width(w1);
        $("header").css("padding-left", w1);
        $("h1").css("display", "inline");
    }
}