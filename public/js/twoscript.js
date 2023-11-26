const board= document.querySelector('.boxer');
const mlogin= document.querySelector('.register-move');
const mregister= document.querySelector('.login-move');

mregister.addEventListener('click', ()=> {
    board.classList.add('active')
});


mlogin.addEventListener('click', ()=> {
    board.classList.add('active')
});

