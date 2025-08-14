const wrapper = document.querySelector(".wrapper"),
    searchInput = wrapper.querySelector("input"),
    volume = wrapper.querySelector(".word i"),
    infoText = wrapper.querySelector(".info-text"),
    synonymsList = wrapper.querySelector(".synonyms .list"),
    antonymsList = wrapper.querySelector(".antonyms .list"),
    removeIcon = wrapper.querySelector(".search span");

let audio;

// Get first audio url safely from phonetics array
function getAudioUrl(phoneticsArr) {
    if (!phoneticsArr) return "";
    const withAudio = phoneticsArr.find(p => p.audio);
    return withAudio ? withAudio.audio : "";
}

async function data(result, word) {
    if (!Array.isArray(result) || result.length === 0 || result.title) {
        infoText.innerHTML = `Can't find the meaning of <span>"${word}"</span>. Please try another word.`;
        wrapper.classList.remove("active");
        return;
    }
    const entry = result[0];
    wrapper.classList.add("active");

    // Word and phonetics
    document.querySelector(".word p").innerText = entry.word || word;
    let phoneticsText = entry.phonetics?.find(p => p.text)?.text || "";
    let partOfSpeech = entry.meanings?.[0]?.partOfSpeech || "";
    document.querySelector(".word span").innerText = `${partOfSpeech} /${phoneticsText}/`;

    // Pronunciation audio
    const audioUrl = getAudioUrl(entry.phonetics);
    audio = audioUrl ? new Audio(audioUrl.startsWith("http") ? audioUrl : `https:${audioUrl}`) : null;

    // Safe extraction for meaning & example
    let meaning = "Not available";
    let example = "Not available";
    if (entry.meanings && Array.isArray(entry.meanings)) {
        for (let meaningObj of entry.meanings) {
            if (meaningObj.definitions && Array.isArray(meaningObj.definitions)) {
                for (let defObj of meaningObj.definitions) {
                    if (defObj.definition && meaning === "Not available")
                        meaning = defObj.definition;
                    if (defObj.example && example === "Not available")
                        example = defObj.example;
                }
            }
        }
    }
    document.querySelector(".meaning span").innerText = meaning;
    document.querySelector(".example span").innerText = example;

    // Gather synonyms & antonyms from all levels
    let allSynonyms = new Set();
    let allAntonyms = new Set();
    entry.meanings.forEach(meaning => {
        if (meaning.synonyms) meaning.synonyms.forEach(s => allSynonyms.add(s));
        if (meaning.antonyms) meaning.antonyms.forEach(a => allAntonyms.add(a));
        meaning.definitions.forEach(def => {
            if (def.synonyms) def.synonyms.forEach(s => allSynonyms.add(s));
            if (def.antonyms) def.antonyms.forEach(a => allAntonyms.add(a));
        });
    });

    // Fallback: Datamuse API for synonyms/antonyms if not found
    if (allSynonyms.size === 0) {
        try {
            const datamuseSyn = await fetch(`https://api.datamuse.com/words?rel_syn=${word}`).then(r => r.json());
            datamuseSyn.forEach(item => allSynonyms.add(item.word));
        } catch (e) { }
    }
    if (allAntonyms.size === 0) {
        try {
            const datamuseAnt = await fetch(`https://api.datamuse.com/words?rel_ant=${word}`).then(r => r.json());
            datamuseAnt.forEach(item => allAntonyms.add(item.word));
        } catch (e) { }
    }

    // Show synonyms
    if (allSynonyms.size > 0) {
        synonymsList.parentElement.style.display = "block";
        synonymsList.innerHTML = [...allSynonyms]
            .slice(0, 5)
            .map(s => `<span onclick="search('${s}')">${s}</span>`)
            .join(" ");
    } else {
        synonymsList.parentElement.style.display = "none";
    }

    // Show antonyms
    if (allAntonyms.size > 0) {
        antonymsList.parentElement.style.display = "block";
        antonymsList.innerHTML = [...allAntonyms]
            .slice(0, 5)
            .map(a => `<span onclick="search('${a}')">${a}</span>`)
            .join(" ");
    } else {
        antonymsList.parentElement.style.display = "none";
    }
}

// Perform search and reset input
function search(word) {
    fetchApi(word);
    searchInput.value = word;
}

// Fetch API, display loading, call data()
function fetchApi(word) {
    wrapper.classList.remove("active");
    infoText.style.color = "#000";
    infoText.innerHTML = `Searching the meaning of <span>"${word}"</span>...`;
    let url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
    fetch(url)
        .then(response => response.json())
        .then(result => data(result, word))
        .catch(() => {
            infoText.innerHTML = `Can't find the meaning of <span>"${word}"</span>. Please try another word.`;
        });
}

// Event listeners
searchInput.addEventListener("keyup", e => {
    let word = e.target.value.trim();
    if (e.key === "Enter" && word) fetchApi(word);
});

volume.addEventListener("click", () => {
    if (audio) {
        volume.style.color = "#4D59FB";
        audio.play();
        setTimeout(() => {
            volume.style.color = "#999";
        }, 800);
    }
});

removeIcon.addEventListener("click", () => {
    searchInput.value = "";
    searchInput.focus();
    wrapper.classList.remove("active");
    infoText.style.color = "#9A9A9A";
    infoText.innerHTML = "Type any existing word and press enter to get meaning, example, synonyms, and antonyms.";
});
