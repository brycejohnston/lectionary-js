import * as React from "react";
import { DateTime } from "luxon";
import { Link } from "wouter";

import { CalendarBuilder } from "../lib/CalendarBuilder";
import { KeyLoader } from "../lib/KeyLoader";
import { findColor, findProperByType, hasReadings } from "../lib/utils";

import lectionary from "../data/lsb-1yr.json";
import festivals from "../data/lsb-festivals.json";
import daily from "../data/lsb-daily.json";
import commemorations from "../data/lsb-commemorations.json";

const loader = new KeyLoader({ lectionary, festivals, daily, commemorations });

/**
 * @typedef {object} Props
 * @prop {number} year
 * @prop {number} month
 * @extends {Component<Props>}
 */
export default class Calendar extends React.Component {
  componentDidMount() {
    this.build();
  }

  getYearAndMonthLabel({ year, month }) {
    return DateTime.fromObject({ year, month, day: 1 }).toFormat("MMMM y");
  }

  getYearAndMonth() {
    return {
      year: parseInt(this.props.year),
      month: parseInt(this.props.month),
    };
  }

  getNextMonth() {
    const { year, month } = this.getYearAndMonth();

    if (month === 12) {
      return { year: year + 1, month: "01" };
    } else {
      return { year, month: this.padNumber(month + 1) };
    }
  }

  getLastMonth() {
    const { year, month } = this.getYearAndMonth();

    if (month === 1) {
      return { year: year - 1, month: 12 };
    } else {
      return { year, month: this.padNumber(month - 1) };
    }
  }

  padNumber(v) {
    if (v < 10) {
      return `0${v}`;
    } else {
      return `${v}`;
    }
  }

  build() {
    const { year, month } = this.getYearAndMonth();

    window.document.title = `${this.getYearAndMonthLabel({
      year,
      month,
    })} · Lutheran Lectionary`;

    const builder = new CalendarBuilder(year, month);
    return builder.build(loader);
  }

  goToDay(day) {
    return () => {
      window.location.hash = this.makeUrlToDay(day);
    };
  }

  makeUrlToDay(day) {
    const { year, month } = this.getYearAndMonth();
    return `/${year}/${month}/${day}/`;
  }

  getLiturgicalColorClass(color) {
    if (!color) return "";
    const colorLower = color.toLowerCase();
    return `liturgical-${colorLower}`;
  }

  getBorderColorClass(color) {
    if (!color) return "border-gray-300";
    const colorLower = color.toLowerCase();
    return `border-liturgical-${colorLower}`;
  }

  getBackgroundColorClass(color) {
    if (!color) return "";
    const colorLower = color.toLowerCase();
    return `bg-liturgical-${colorLower}`;
  }

  renderDay(day, weekDay, row) {
    const color =
      findColor(
        // Don't let festivals trump Sundays
        day?.date.weekday === 7 ? null : day?.propers.festivals,
        day?.propers.lectionary,
        day?.sunday?.propers.lectionary
      )?.toLowerCase() ?? "none";
    
    const isToday =
      day && day.date && DateTime.local().hasSame(day.date, "day");
    
    const colorClass = this.getLiturgicalColorClass(color);
    const borderClass = this.getBorderColorClass(color);
    const bgClass = this.getBackgroundColorClass(color);
    
    // Alternate background colors based on position
    const isEvenPosition = (row + weekDay) % 2 === 0;
    const alternatingBg = isEvenPosition ? '#ffffff' : '#f5f5f5';
    
    const className = `
      ${bgClass} ${borderClass}
      ${isToday ? "today" : ""}
    `.trim();

    if (!day || !day.date) {
      return (
        <td 
          className="border border-gray-200" 
          style={{ backgroundColor: alternatingBg }}
          key={weekDay} 
        />
      );
    }

    // Get all propers - check if they exist and have content
    const lectionary = day.propers.lectionary || [];
    const festivals = day.propers.festivals || [];
    const commemoration = findProperByType(day.propers.commemorations, 37);
    const dailyReadings = (day.propers.daily || []).slice(0, 2);

    // Check if festivals have readings (festivals should always display if they exist)
    const hasFestival = festivals.length > 0 && findProperByType(festivals, 0);
    const hasLectionaryReadings = lectionary.length > 0 && hasReadings(lectionary);
    
    // Determine which propers to show (festivals take precedence)
    let primaryPropers = [];
    let showReadings = false;
    
    if (hasFestival) {
      primaryPropers = festivals;
      showReadings = true;
    } else if (hasLectionaryReadings) {
      primaryPropers = lectionary;
      showReadings = true;
    }

    return (
      <td
        className={className}
        style={{ backgroundColor: alternatingBg }}
        onClick={this.goToDay(day.date.day)}
        key={weekDay}
      >
        <div className="h-full flex flex-col p-1">
          {/* Day number with liturgical color */}
          <div className={`day-number font-cinzel ${colorClass} text-center mb-1`}>
            {day.date.day}
            {isToday && (
              <i className="fas fa-star ml-1 text-yellow-500 text-xs"></i>
            )}
          </div>

          {/* Festival/Lectionary Title */}
          {showReadings && (
            <div className="mb-2">
              <div className={`proper-title font-garamond ${colorClass} text-center leading-tight`}>
                <i className="fas fa-cross mr-1 text-xs opacity-60"></i>
                {findProperByType(primaryPropers, 0)?.text}
              </div>
              
              {/* Scripture References - only show if they exist */}
              {hasReadings(primaryPropers) && (
                <div className="mt-1 space-y-0.5">
                  {findProperByType(primaryPropers, 19) && (
                    <div className="proper-reading text-gray-700 font-medium">
                      <span className="font-semibold text-xs">OT:</span> {findProperByType(primaryPropers, 19)?.text}
                    </div>
                  )}
                  {findProperByType(primaryPropers, 1) && (
                    <div className="proper-reading text-gray-700 font-medium">
                      <span className="font-semibold text-xs">Ep:</span> {findProperByType(primaryPropers, 1)?.text}
                    </div>
                  )}
                  {findProperByType(primaryPropers, 2) && (
                    <div className="proper-reading text-gray-700 font-medium">
                      <span className="font-semibold text-xs">Go:</span> {findProperByType(primaryPropers, 2)?.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Commemoration */}
          {commemoration && (
            <div className="commemoration font-crimson text-center mb-2">
              <i className="fas fa-praying-hands mr-1 text-xs text-amber-600"></i>
              <span className="text-xs leading-tight">{commemoration.text}</span>
            </div>
          )}

          {/* Daily Readings (only show if no other propers) */}
          {!showReadings && dailyReadings.length > 0 && (
            <div className="mt-auto space-y-0.5">
              <div className="text-xs text-gray-600 font-semibold text-center mb-1">
                <i className="fas fa-book-open mr-1"></i>
                Daily Readings
              </div>
              {dailyReadings.map((reading, i) => (
                <div key={i} className="proper-reading text-gray-600 text-center">
                  {reading.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
    );
  }

  render() {
    const { year, month } = this.getYearAndMonth();
    const grid = this.build();

    if (!grid) {
      return <div className="flex justify-center items-center h-64">
        <i className="fas fa-spinner fa-spin text-2xl text-gray-500"></i>
      </div>;
    }

    return (
      <div className="calendar-container mx-auto max-w-7xl my-8">
        {/* Navigation */}
        <nav className="calendar-nav p-4 flex items-center justify-between">
          <Link 
            to={`/${Object.values(this.getLastMonth()).join("/")}/`}
            className="flex items-center gap-2"
          >
            <i className="fas fa-chevron-left"></i>
            <span className="font-garamond">
              {this.getYearAndMonthLabel(this.getLastMonth())}
            </span>
          </Link>
          
          <h2 className="font-cinzel text-xl md:text-2xl font-semibold text-center flex-1">
            <i className="fas fa-calendar-alt mr-2"></i>
            {this.getYearAndMonthLabel({ year, month })}
          </h2>
          
          <Link 
            to={`/${Object.values(this.getNextMonth()).join("/")}/`}
            className="flex items-center gap-2"
          >
            <span className="font-garamond">
              {this.getYearAndMonthLabel(this.getNextMonth())}
            </span>
            <i className="fas fa-chevron-right"></i>
          </Link>
        </nav>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <table className="calendar-table w-full">
            <thead>
              <tr>
                <th className="font-cinzel">Sunday</th>
                <th className="font-cinzel">Monday</th>
                <th className="font-cinzel">Tuesday</th>
                <th className="font-cinzel">Wednesday</th>
                <th className="font-cinzel">Thursday</th>
                <th className="font-cinzel">Friday</th>
                <th className="font-cinzel">Saturday</th>
              </tr>
            </thead>
            <tbody>
              {grid.map((week, row) => (
                <tr key={row}>
                  {week.map((day, weekDay) => this.renderDay(day, weekDay, row))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}