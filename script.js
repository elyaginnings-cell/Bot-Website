console.log("🔥 SCRIPT.JS IS ACTUALLY RUNNING 🔥");

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔥 DOM LOADED 🔥");

    document.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", () => {
            alert("BUTTON WORKS!");
        });
    });
});