const p1 = `<script type="application/javascript">`;
const p2 = `</script>`;

export function wrapInCData(content: string) {
	const startPoints: number[] = [];
	const endPoints: number[] = [];

	let counter = 0;

	while (content.indexOf(p1, counter) != -1) {
		const i = content.indexOf(p1, counter);
		startPoints.push(i + p1.length);
		counter = i + p1.length;
	}
	counter = 0;
	while (content.indexOf(p2, counter) != -1) {
		const i = content.indexOf(p2, counter);
		endPoints.push(i);
		counter = i + 1;
	}

	if (startPoints.length != endPoints.length) {
		throw new Error("Length missmatch when adding cdata");
	}

	let ret = "";
	for (let i = 0; i < startPoints.length; i++) {
		const start = startPoints[i];
		const end = endPoints[i];
		ret += `${p1}<![CDATA[${content.slice(start, end)}]]>${p2}`;
	}
	return ret;
}
