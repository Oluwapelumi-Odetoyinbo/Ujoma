
import React, { useEffect, useRef } from 'react';
import { GlobeProps } from '../types';

declare const d3: any;
declare const topojson: any;

interface ExtendedGlobeProps extends GlobeProps {
  isRevealing?: boolean;
}

const Globe: React.FC<ExtendedGlobeProps> = ({ onCountrySelect, targetCoordinates, isCinematicMode, isRevealing }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const projectionRef = useRef<any>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll("*").remove();

    // Start very far if revealing
    const initialScaleFactor = isRevealing ? 10 : 2.8;
    const projection = d3.geoOrthographic()
      .scale(Math.min(width, height) / initialScaleFactor)
      .translate([width / 2, height / 2])
      .clipAngle(90);
    
    projectionRef.current = projection;
    const path = d3.geoPath().projection(projection);
    const g = svg.append('g');

    // Atmosphere Glow Filter
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '15').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Outer Glow
    g.append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', projection.scale() + 10)
      .attr('fill', 'rgba(100, 150, 255, 0.05)')
      .style('filter', 'url(#glow)')
      .attr('class', 'pulsing-glow');

    // Water
    g.append('path')
      .datum({ type: 'Sphere' })
      .attr('d', path)
      .attr('fill', '#04060b')
      .attr('stroke', '#1a2a4a')
      .attr('stroke-width', '0.5');

    // Fetch Map
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(res => res.json())
      .then(worldData => {
        const countries = topojson.feature(worldData, worldData.objects.countries).features;

        g.selectAll('.country')
          .data(countries)
          .enter()
          .append('path')
          .attr('class', 'country')
          .attr('d', path)
          .attr('fill', (d: any) => d.properties.name === "South Africa" || d.properties.name === "Nigeria" || d.properties.name === "Kenya" ? '#b45309' : '#111827')
          .attr('stroke', '#374151')
          .attr('stroke-width', '0.2')
          .on('mouseover', function() {
            if (!isCinematicMode) d3.select(this).transition().duration(200).attr('fill', '#b45309');
          })
          .on('mouseout', function(event: any, d: any) {
            if (!isCinematicMode) {
                const name = d.properties.name;
                const isAfrican = ["South Africa", "Nigeria", "Kenya"].includes(name);
                d3.select(this).transition().duration(500).attr('fill', isAfrican ? '#b45309' : '#111827');
            }
          })
          .on('click', (event: any, d: any) => {
            if (!isCinematicMode) onCountrySelect(d.properties.name);
          });

        // Graticule
        const graticule = d3.geoGraticule();
        g.append('path')
          .datum(graticule())
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', '#ffffff05')
          .attr('stroke-width', '0.3');

        // Initial Animation into view if we are in revealing state
        if (isRevealing) {
          d3.transition()
            .duration(3000)
            .ease(d3.easeCubicOut)
            .tween('reveal', () => {
              const s = d3.interpolate(projection.scale(), Math.min(width, height) / 2.8);
              return (t: number) => {
                projection.scale(s(t));
                svg.selectAll('path').attr('d', path);
              };
            });
        }
      });

    // Rotation
    let rotationTimer = d3.timer(() => {
      if (!targetCoordinates) {
        const rotate = projection.rotate();
        projection.rotate([rotate[0] + 0.05, rotate[1]]);
        svg.selectAll('path').attr('d', path);
      }
    });

    if (!isCinematicMode) {
      const drag = d3.drag().on('drag', (event: any) => {
        rotationTimer.stop();
        const rotate = projection.rotate();
        const k = 75 / projection.scale();
        projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
        svg.selectAll('path').attr('d', path);
      });
      svg.call(drag);
    }

    return () => rotationTimer.stop();
  }, [isCinematicMode, isRevealing]);

  // Handle zooming
  useEffect(() => {
    if (targetCoordinates && projectionRef.current && svgRef.current) {
      const [lon, lat] = targetCoordinates;
      const svg = d3.select(svgRef.current);
      const path = d3.geoPath().projection(projectionRef.current);
      
      d3.transition()
        .duration(2500)
        .ease(d3.easeCubicInOut)
        .tween('rotate', () => {
          const r = d3.interpolate(projectionRef.current.rotate(), [-lon, -lat]);
          const s = d3.interpolate(projectionRef.current.scale(), isCinematicMode ? 2000 : 800);
          return (t: number) => {
            projectionRef.current.rotate(r(t));
            projectionRef.current.scale(s(t));
            svg.selectAll('path').attr('d', path);
          };
        });
    }
  }, [targetCoordinates, isCinematicMode]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden globe-container">
      <svg ref={svgRef} className={`w-full h-full transition-opacity duration-1000 ${isRevealing ? 'opacity-100' : 'opacity-100'}`} />
      <div className="absolute inset-0 cinematic-vignette"></div>
    </div>
  );
};

export default Globe;
