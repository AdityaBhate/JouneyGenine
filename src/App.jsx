import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
	GoogleGenerativeAI,
	HarmCategory,
	HarmBlockThreshold,
} from "@google/generative-ai";
import "./App.css";

function App() {
	const API_KEY = "AIzaSyBOUU0Vm87QmjDUgvUTLfD-OPIK2kb5jEw";
	const MODEL_NAME = "gemini-1.5-flash";
	const genAI = new GoogleGenerativeAI(
		"AIzaSyBOUU0Vm87QmjDUgvUTLfD-OPIK2kb5jEw"
	);
	const model = genAI.getGenerativeModel({ model: MODEL_NAME });
	const mapRef = useRef(null);
	const [map, setMap] = useState(null);
	const [origin, setOrigin] = useState("");
	const [destination, setDestination] = useState("");
	const [directionsService, setDirectionsService] = useState(null);
	const [directionsDisplay, setDirectionsDisplay] = useState(null);
	const [currentRoute, setCurrentRoute] = useState(null);
	const [trafficLayer, setTrafficLayer] = useState(null);
	const [originWeather, setOriginWeather] = useState(null);
	const [destinationWeather, setDestinationWeather] = useState(null);
	const [duration, setDuration] = useState(null);
	const [trafficDuration, setTrafficDuration] = useState(null);
	const conversationsDiv = useRef(null);

	useEffect(() => {
		if (window.google) {
			initMap();
		} else {
			window.initMap = initMap;
			const script = document.createElement("script");
			script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAOruelu_hzbuimB4TF0jmuVK9BJngavQo&libraries=places&async=true`;
			script.async = true;
			document.head.appendChild(script);
		}
	}, []);

	const initMap = () => {
		const mapOptions = {
			center: { lat: 30.267153, lng: -97.743057 },
			zoom: 20,
			styles: [
				{
					featureType: "all",
					elementType: "all",
					stylers: [
						{ invert_lightness: true },
						{ saturation: -100 },
						{ lightness: 0 },
						{ visibility: "on" },
					],
				},
			],
		};
		const map = new window.google.maps.Map(mapRef.current, mapOptions);
		setMap(map);

		const trafficLayer = new window.google.maps.TrafficLayer();
		trafficLayer.setMap(map);
		setTrafficLayer(trafficLayer);

		const transitLayer = new window.google.maps.TransitLayer();
		transitLayer.setMap(map);

		const directionsService = new window.google.maps.DirectionsService();
		setDirectionsService(directionsService);

		const directionsDisplay = new window.google.maps.DirectionsRenderer();
		directionsDisplay.setMap(map);
		setDirectionsDisplay(directionsDisplay);
	};

	const getDirections = async (event) => {
		event.preventDefault();
		const originInput = document.getElementById("origin-input").value;
		const destinationInput = document.getElementById("destination-input").value;
		const request = {
			origin: originInput,
			destination: destinationInput,
			travelMode: window.google.maps.TravelMode.DRIVING,
		};
		directionsService.route(request, async (result, status) => {
			if (status === window.google.maps.DirectionsStatus.OK) {
				setCurrentRoute(result);
				directionsDisplay.setDirections(result);
				displayRoute(result);
				getTrafficInfo(originInput, destinationInput);

				const originLatLng = result.routes[0].legs[0].start_location;
				const destinationLatLng = result.routes[0].legs[0].end_location;

				const originWeather = await getWeather(
					originLatLng.lat(),
					originLatLng.lng()
				);
				const destinationWeather = await getWeather(
					destinationLatLng.lat(),
					destinationLatLng.lng()
				);

				setOriginWeather(originWeather);
				setDestinationWeather(destinationWeather);
			} else {
				console.log("Error occurred while retrieving directions:", status);
			}
		});
	};

	const getTrafficInfo = (origin, destination) => {
		const distanceMatrixService =
			new window.google.maps.DistanceMatrixService();
		const getDate = document.getElementById("date-search").value;
		distanceMatrixService.getDistanceMatrix(
			{
				origins: [origin],
				destinations: [destination],
				travelMode: window.google.maps.TravelMode.DRIVING,
				drivingOptions: {
					departureTime: new Date() || getDate, // Current time
				},
				unitSystem: window.google.maps.UnitSystem.METRIC,
			},
			(response, status) => {
				if (status === window.google.maps.DistanceMatrixStatus.OK) {
					const result = response.rows[0].elements[0];
					if (result.status === "OK") {
						updateTrafficCondition(result);
					} else {
						console.log("Error in Distance Matrix response:", result.status);
					}
				} else {
					console.log(
						"Error occurred while retrieving distance matrix:",
						status
					);
				}
			}
		);
	};

	const updateTrafficCondition = (result) => {
		const trafficConditionDiv = document.getElementById("traffic-condition");
		const durationInTraffic = result.duration_in_traffic;
		const duration = result.duration.value;
		const durationText = result.duration.text;
		setDuration(duration);
		setTrafficDuration(durationInTraffic.value);
		const durationContainer = document.getElementById("duration");
		durationContainer.innerHTML = "Duration: " + durationText;
		if (durationInTraffic) {
			const trafficRatio = durationInTraffic.value / duration;
			if (trafficRatio > 1.2) {
				trafficConditionDiv.textContent =
					"Heavy traffic. Consider alternative routes.";
				trafficConditionDiv.style.color = "red";
			} else if (trafficRatio > 1) {
				trafficConditionDiv.textContent = "Moderate traffic. Plan accordingly.";
				trafficConditionDiv.style.color = "orange";
			} else {
				trafficConditionDiv.textContent = "Light traffic. Have a safe trip!";
				trafficConditionDiv.style.color = "green";
			}
		} else {
			trafficConditionDiv.textContent = "Traffic information is not available.";
			trafficConditionDiv.style.color = "black";
		}
	};

	const displayRoute = (result) => {
		// const directionsResultDiv = document.getElementById("directions-result");
		// directionsResultDiv.innerHTML = "";
		// const directionsResultText = document.createElement("div");
		// directionsResultText.innerHTML = "<strong>Directions:</strong>";
		// directionsResultDiv.appendChild(directionsResultText);
		// const steps = result.routes[0].legs[0].steps;
		// for (let i = 0; i < steps.length; i++) {
		// 	const stepText = document.createElement("div");
		// 	stepText.innerHTML = `<div style='font-size: 0.9em'>${steps[i].instructions}</div>`;
		// 	directionsResultDiv.appendChild(stepText);
		// }
		// directionsDisplay.setMap(map);
	};

	const getWeather = async (lat, lng) => {
		try {
			const response = await axios.get(
				`http://localhost:3001/api/weather?lat=${lat}&lng=${lng}`
			);
			const data = response.data.data[0];
			return {
				description: data.weather.description,
				temp: data.temp,
			};
		} catch (error) {
			console.error("Error fetching weather data:", error);
			return { description: "Unable to fetch weather", temp: "N/A" };
		}
	};

	const sendToGemini = async () => {
		const data = {
			from_location: origin,
			to_location: destination,
			from_weather: originWeather?.description || "N/A",
			to_weather: destinationWeather?.description || "N/A",
			total_travel_duration: duration,
			total_time_in_traffic: trafficDuration,
		};

		const generationConfig = {
			temperature: 1,
			topK: 64,
			topP: 0.95,
			maxOutputTokens: 8192,
		};

		const safetySettings = [
			{
				category: HarmCategory.HARM_CATEGORY_HARASSMENT,
				threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			},
			// other safety settings
		];

		try {
			const result = await model.generateContent({
				contents: [
					{
						role: "user",
						parts: [
							{ text: "Act as a professional travel planner ..." },
							{ text: `input: ${JSON.stringify(data)}` },
						],
					},
				],
				generationConfig,
				safetySettings,
			});

			const response = result.response.text();
			const newMessage = document.createElement("div");
			newMessage.innerHTML = response
				.replace(/\*\*(.+?)\*\*/g, "$1")
				.replace(/\n/g, "<br>");
			conversationsDiv.current.appendChild(newMessage);
		} catch (error) {
			console.error("Error calling Gemini API:", error);
		}
	};

	return (
		<div className='mainClass'>
			<div className='chat'>
				<div className='appheader'>
					<p id='heading'>Journey Genie</p>
					<p>Real time Travel Updates and your trip planner</p>
				</div>
				<div id='controls'>
					<form id='directions-form' onSubmit={getDirections}>
						<input
							type='text'
							id='origin-input'
							placeholder='Start Location'
							value={origin}
							onChange={(event) => setOrigin(event.target.value)}
						/>
						<input
							type='text'
							id='destination-input'
							value={destination}
							placeholder='Destination Location'
							onChange={(event) => setDestination(event.target.value)}
						/>
						<input
							type='datetime-local'
							id='date-search'
							placeholder='Search for a location'
						/>
						<button className='getDirection-button' type='submit'>
							Make the Genie Magic!
						</button>
					</form>
				</div>
				<div className='conversations'>
					<div className='convInfo'>
						<div id='duration'>---</div>
						<div id='traffic-condition'>---</div>
						<div id='weather'>
							{originWeather === null
								? "---"
								: `Origin Weather: ${originWeather?.temp}`}
						</div>
						<div id='weather'>
							{destinationWeather === null
								? "---"
								: `Destination Weather: ${destinationWeather?.temp}`}
						</div>
					</div>
					<div className='geminiResponse' ref={conversationsDiv}></div>
					<div className='chatin'>
						<input type='text' className='chatInput' />
						<button className='sendChat' onClick={sendToGemini}>
							Send
						</button>
					</div>
				</div>
			</div>

			<div id='map' ref={mapRef} style={{ height: "100%", width: "70%" }}></div>
		</div>
	);
}

export default App;
