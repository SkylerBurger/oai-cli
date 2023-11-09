// Read in JSON file
const jsonFile = new XMLHttpRequest();
jsonFile.open("GET", "../output/chat_backup.json", true);
jsonFile.send();

jsonFile.onload = function () {
    const jsonString = jsonFile.responseText;
    const json = JSON.parse(jsonString);

    // Target element
    const timelineElement = document.getElementById('timeline');

    // Iterate over history
    for (let i = 0; i < json.messages.history.length; i++) {
        const message = json.messages.history[i];
        const lines = message.content.split("\n");

        // Container
        const container = document.createElement("div");
        container.setAttribute("contenteditable", "true");
        container.classList.add('container');
        if (message.role === "user") {
            container.classList.add("user-input");
        }
        const containerId = `message-${i}`;
        container.id = containerId;

        // Content and space
        for (let j = 0; j < lines.length; j++) {
            const textDiv = document.createElement("div");
            textDiv.textContent = lines[j];
            container.appendChild(textDiv);

            const spacer = document.createElement("div");
            spacer.innerHTML = "<br />";
            container.appendChild(spacer);
        }

        // Button to prove stringification of spacing
        const button = document.createElement('button');
        button.classList.add('stringify');
        button.textContent = 'Stringify';
        button.addEventListener('click', () => {
            const element = document.getElementById(containerId);
            element.innerHTML = element.innerHTML.replace(/<div><br><\/div>/g, '\n');
            console.log(JSON.stringify(element.textContent));
        })

        timelineElement.appendChild(container);
        timelineElement.appendChild(button);
    }
}
