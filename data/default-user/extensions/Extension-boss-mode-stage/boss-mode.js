// ==Boss Mode Stage Extension==
window.addEventListener("llm_prepare_input", function (e) {
    const input = e.detail.input;
    let modifiedInput = input;
    let criticalInstructions = [];
    let ongoingInstructions = [];

    // Extract [immediate] instructions
    modifiedInput = modifiedInput.replace(/\[(?!\[)(.*?)\]/g, (_, instr) => {
        criticalInstructions.push(instr);
        return '';
    });

    // Extract [[long-term]] instructions
    modifiedInput = modifiedInput.replace(/\[\[(.*?)\]\]/g, (_, instr) => {
        ongoingInstructions.push(instr);
        return '';
    });

    // Combine final prompt
    let systemDirectives = '';

    if (ongoingInstructions.length > 0) {
        systemDirectives += '### Ongoing Instruction(s):\n';
        ongoingInstructions.forEach(i => systemDirectives += `- ${i.trim()}\n`);
    }

    if (criticalInstructions.length > 0) {
        systemDirectives += '### Critical Instruction(s):\n';
        criticalInstructions.forEach(i => systemDirectives += `- ${i.trim()}\n`);
    }

    if (systemDirectives) {
        e.detail.input = `${modifiedInput.trim()}\n\n${systemDirectives.trim()}`;
    }
});