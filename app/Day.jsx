import * as React from "react";
import { DateTime } from "luxon";
import { Link } from "wouter";

import { Week } from "../lib/Week";
import { KeyLoader } from "../lib/KeyLoader";
import { findProperByType, findColor } from "../lib/utils";

import lectionary from "../data/lsb-1yr.json";
import festivals from "../data/lsb-festivals.json";
import daily from "../data/lsb-daily.json";
import commemorations from "../data/lsb-commemorations.json";

import types from "../data/types.json";

const typesById = {};
types.forEach((type) => {
  typesById[type.type] = type;
});

const loader = new KeyLoader({
  lectionary,
  festivals,
  daily,
  commemorations,
});

/**
 * @typedef {object} Props
 * @prop {number} year
 * @prop {number} month
 * @prop {number} day
 * @extends {Component<Props>}
 */
export default class Day extends React.Component {
  getDate() {
    const { year, month, day } = this.props;
    return DateTime.fromObject({ year, month, day });
  }

  getTitle(day) {
    const festivalTitle = findProperByType(day.propers.festival, 0)?.text;
    const sundayTitle = findProperByType(day.sunday.lectionary, 0)?.text;
    const weekdayTitle =
      day.date.weekday === 7
        ? null
        : `${day.date.weekdayLong} of ${sundayTitle}`;
    return festivalTitle || weekdayTitle || sundayTitle;
  }

  getSectionId(i, type) {
    return `proper_${i}_${typesById[type].name
      .toLowerCase()
      .replace(" ", "_")}`;
  }

  getAccordanceUrl(text) {
    const end = text.indexOf("-") === -1 ? text.length : text.indexOf("-");
    const passage = text.replace(" ", "_").substring(0, end);
    return `accord://read/?#${passage}`;
  }

  scrollToSection(i, type) {
    return () => {
      window.scrollTo({
        top: document.getElementById(this.getSectionId(i, type)).offsetTop - 60,
        behavior: "smooth",
      });
    };
  }

  handleScrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  getLiturgicalColorClass(color) {
    if (!color) return "";
    const colorLower = color.toLowerCase();
    return `liturgical-${colorLower}`;
  }

  render() {
    const date = this.getDate();
    const yesterday = this.getDate().minus({ days: 1 });
    const tomorrow = this.getDate().plus({ days: 1 });
    const weekCalculator = new Week(date);
    const week = weekCalculator.getWeek();
    const sunday = weekCalculator.getSunday();

    const day = {
      date,
      week,
      propers: loader.load(date, week),
      sunday: loader.load(sunday, week),
    };

    day.propers.daily = [
      // Find our commemoration and prepend it to the daily lectionary propers
      {
        ...(findProperByType(day.propers.commemorations, 37) ?? {
          text: "Daily Lectionary",
        }),
        type: 0, // Reset commemoration description to title
      },
      // Only include the first two daily readings (week takes precedent over month)
      ...day.propers.daily.slice(0, 2),
    ];

    // If this is a week day and we have no other propers, append Sunday's collect
    if (
      day.propers.lectionary.length === 0 &&
      day.propers.festivals.length === 0
    ) {
      const sundayCollect = findProperByType(day.sunday.lectionary, 20);

      // TODO: Adjust the title
      if (sundayCollect) {
        day.propers.daily.splice(1, 0, sundayCollect);
      }
    }

    const title = this.getTitle(day);
    const color = findColor(
      day.propers.festival,
      day.propers.lectionary,
      day.sunday.lectionary
    )?.toLowerCase();

    const colorClass = this.getLiturgicalColorClass(color);

    document.title = `${title} · Lutheran Lectionary`;

    return (
      <div className="day-view mx-auto max-w-4xl my-8">
        {/* Navigation */}
        <nav className="day-nav p-4 flex items-center justify-between">
          <Link 
            to={`/${yesterday.toFormat("y/LL/dd")}/`}
            className="flex items-center gap-2"
          >
            <span>‹ {yesterday.toFormat("LLLL d, y")}</span>
          </Link>
          
          <Link 
            className="text-center font-semibold" 
            to={`/${date.toFormat("y/LL")}/`}
          >
            {date.toFormat("LLLL")}
          </Link>
          
          <Link 
            to={`/${tomorrow.toFormat("y/LL/dd")}/`}
            className="flex items-center gap-2"
          >
            <span>{tomorrow.toFormat("LLLL d, y")} ›</span>
          </Link>
        </nav>

        <div className="p-6">
          {/* Date and Title */}
          <div className="text-center mb-8">
            <h2 className={`text-3xl md:text-4xl font-bold mb-2 ${colorClass}`}>
              {date.toLocaleString({
                month: "long",
                day: "2-digit",
                year: "numeric",
              })}
            </h2>
            <h3 className={`text-xl md:text-2xl ${colorClass}`}>
              {title}
            </h3>
          </div>

          {/* Table of Contents */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold mb-4 text-center">
              Propers for this Day
            </h4>
            
            {[day.propers.lectionary, day.propers.festivals, day.propers.daily]
              .filter((p) => p.length > 0)
              .map((propers, i) => (
                <div key={`propers-toc-${i}`} className="mb-4">
                  <h5 className={`text-base font-semibold mb-2 ${this.getLiturgicalColorClass(findColor(propers)?.toLowerCase())}`}>
                    {findProperByType(propers, 0)?.text}
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                    {propers
                      .filter(
                        (proper) => typesById[proper.type]?.is_viewable ?? true
                      )
                      .map((proper, j) => (
                        <button
                          key={`propers-toc-${i}-${j}`}
                          className="text-left p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors reading-link"
                          onClick={this.scrollToSection(i, proper.type)}
                        >
                          {typesById[proper.type].name}
                          {typesById[proper.type].is_reading && (
                            <span className="text-gray-600">: {proper.text}</span>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
          </div>

          {/* Propers Sections */}
          {[day.propers.lectionary, day.propers.festivals, day.propers.daily]
            .filter((p) => p.length > 0)
            .map((propers, i) => (
              <div key={`propers-${i}`} className="proper-section">
                <h2 className={`${this.getLiturgicalColorClass(findColor(propers)?.toLowerCase())}`}>
                  {findProperByType(propers, 0)?.text}
                </h2>
                
                <div className="p-6">
                  {propers
                    .filter((proper) => typesById[proper.type]?.is_viewable ?? true)
                    .map((proper, j) => (
                      <div
                        id={this.getSectionId(i, proper.type)}
                        key={`propers-${i}-${j}`}
                        className="mb-8 last:mb-0"
                      >
                        <h3>
                          {typesById[proper.type].name}

                          {typesById[proper.type].is_reading && (
                            <span className="ml-2">
                              <span className="text-gray-500">·</span>
                              <a
                                target="_blank"
                                rel="noreferrer"
                                href={`https://www.biblegateway.com/passage/?search=${proper.text}&version=ESV`}
                                className="reading-link ml-2"
                              >
                                {proper.text}
                              </a>
                              <a
                                title="Open this reading using Accordance, if you don't have it check it out at http://accordancebible.com"
                                href={this.getAccordanceUrl(proper.text)}
                                className="ml-2"
                              >
                                <i className="accordance-icon"></i>
                              </a>
                            </span>
                          )}
                        </h3>
                        
                        {!typesById[proper.type].is_reading && (
                          <div
                            className="mt-4 text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: proper.text,
                            }}
                          />
                        )}
                        
                        <div className="text-right mt-4">
                          <button 
                            className="reading-link text-sm"
                            onClick={this.handleScrollToTop}
                          >
                            Back to top
                          </button>
                        </div>
                        
                        {j < propers.filter((p) => typesById[p.type]?.is_viewable ?? true).length - 1 && (
                          <hr className="mt-6 border-gray-300" />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }
}