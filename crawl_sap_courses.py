#!/usr/bin/env python3
"""
SAP Learning Hub Course Crawler
Extracts exercise-level data from SAP Learning course pages.
"""

import requests
import re
import json
import time
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://learning.sap.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

COURSES = {
    "CO": [
        {"url": "https://learning.sap.com/courses/outlining-cost-management-and-profitability-analysis", "name": "Outlining Cost Management and Profitability Analysis"},
        {"url": "https://learning.sap.com/courses/detailing-profitability-accounting-for-discrete-industries", "name": "Detailing Profitability Accounting for Discrete Industries"},
        {"url": "https://learning.sap.com/courses/detailing-profitability-accounting-in-make-to-order-scenarios", "name": "Detailing Profitability Accounting in Make-to-Order Scenarios"},
        {"url": "https://learning.sap.com/courses/detailing-posting-control-allocations-and-settlement", "name": "Detailing Posting Control, Allocations, and Settlement"},
    ],
    "MM": [
        {"url": "https://learning.sap.com/courses/implementing-sap-s-4hana-cloud-public-edition", "name": "Implementing SAP S/4HANA Cloud Public Edition"},
        {"url": "https://learning.sap.com/courses/exploring-end-to-end-business-processes-in-sap-business-suite", "name": "Exploring End-to-End Business Processes in SAP Business Suite"},
    ],
    "SD": [
        {"url": "https://learning.sap.com/courses/sap-s-4hana-sales-insights", "name": "SAP S/4HANA Sales Insights"},
        {"url": "https://learning.sap.com/courses/exploring-sap-s-4hana-sales-essentials", "name": "Exploring SAP S/4HANA Sales Essentials"},
    ],
    "SCM": [
        {"url": "https://learning.sap.com/courses/discovering-sap-supply-chain-management-solutions", "name": "Discovering SAP Supply Chain Management Solutions"},
        {"url": "https://learning.sap.com/courses/positioning-sap-supply-chain-management-solutions", "name": "Positioning SAP Supply Chain Management Solutions"},
        {"url": "https://learning.sap.com/courses/introducing-sap-business-ai-for-sap-supply-chain-management", "name": "Introducing SAP Business AI for SAP Supply Chain Management"},
    ],
}


def fetch_page(url, retries=3):
    """Fetch page HTML with retries."""
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            if resp.status_code == 200:
                return resp.text
            print(f"  [WARN] Status {resp.status_code} for {url}")
        except Exception as e:
            print(f"  [ERR] Attempt {attempt+1} failed for {url}: {e}")
        time.sleep(1)
    return None


def extract_next_data(html):
    """Extract __NEXT_DATA__ JSON from the page."""
    match = re.search(r'<script\s+id="__NEXT_DATA__"\s+type="application/json">(.*?)</script>', html, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    return None


def get_lesson_urls_from_course_page(course_url):
    """Extract all lesson URLs from a course page using __NEXT_DATA__ or HTML parsing."""
    html = fetch_page(course_url)
    if not html:
        return [], []

    # Try __NEXT_DATA__ first
    next_data = extract_next_data(html)
    if next_data:
        # Try to find lesson/unit data in the Next.js page props
        try:
            props = next_data.get("props", {}).get("pageProps", {})
            # Print keys for debugging
            print(f"  [DEBUG] pageProps keys: {list(props.keys())[:10]}")
            # Look for units/lessons in various possible locations
            course_data = props.get("course", props.get("data", props))
            if isinstance(course_data, dict):
                print(f"  [DEBUG] course_data keys: {list(course_data.keys())[:15]}")
                units = course_data.get("units", course_data.get("chapters", course_data.get("sections", [])))
                if units:
                    all_lessons = []
                    all_units = []
                    for unit in units:
                        unit_title = unit.get("title", unit.get("name", ""))
                        lessons = unit.get("lessons", unit.get("topics", unit.get("items", [])))
                        unit_info = {"title": unit_title, "lessons": []}
                        for lesson in lessons:
                            lesson_title = lesson.get("title", lesson.get("name", ""))
                            lesson_slug = lesson.get("slug", lesson.get("path", ""))
                            if lesson_slug:
                                lesson_url = f"{course_url}/{lesson_slug}"
                                unit_info["lessons"].append({"title": lesson_title, "url": lesson_url})
                                all_lessons.append({"title": lesson_title, "url": lesson_url})
                        all_units.append(unit_info)
                    if all_lessons:
                        return all_units, all_lessons
        except Exception as e:
            print(f"  [DEBUG] Error parsing next_data: {e}")

    # Fallback: parse HTML for links
    soup = BeautifulSoup(html, "lxml")
    
    # Extract course slug
    course_slug = course_url.rstrip("/").split("/")[-1]
    
    # Find all links that match lesson URL pattern
    lesson_links = []
    seen_urls = set()
    
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        # Lesson URLs: /courses/{course-slug}/{lesson-slug} or /courses/{course-slug}/{lesson-slug}_{uuid}
        if f"/courses/{course_slug}/" in href and href != f"/courses/{course_slug}" and href != f"/courses/{course_slug}/":
            full_url = urljoin(BASE_URL, href)
            if full_url not in seen_urls:
                seen_urls.add(full_url)
                title = a_tag.get_text(strip=True) or href.split("/")[-1]
                lesson_links.append({"title": title, "url": full_url})
    
    return [], lesson_links


def find_all_lesson_urls_from_nextdata(html, course_slug):
    """Deep search for lesson URLs in __NEXT_DATA__."""
    next_data = extract_next_data(html)
    if not next_data:
        return []
    
    # Serialize to string and find all matching URLs
    data_str = json.dumps(next_data)
    pattern = rf'/courses/{re.escape(course_slug)}/([a-z0-9\-]+(?:_[a-f0-9\-]+)?)'
    matches = re.findall(pattern, data_str)
    
    urls = []
    seen = set()
    for match in matches:
        url = f"{BASE_URL}/courses/{course_slug}/{match}"
        if url not in seen:
            seen.add(url)
            urls.append(url)
    
    return urls


def check_lesson_for_exercises(url, html=None):
    """Check a lesson page for exercises. Returns (lesson_title, has_exercise, exercise_titles)."""
    if html is None:
        html = fetch_page(url)
    if not html:
        return ("Unknown", False, [])
    
    soup = BeautifulSoup(html, "lxml")
    
    # Get lesson title
    title_tag = soup.find("h1")
    lesson_title = title_tag.get_text(strip=True) if title_tag else url.split("/")[-1]
    
    # Check for "Exercise Start Exercise" pattern
    text = soup.get_text()
    
    exercises = []
    
    # Pattern 1: Look for "Exercise Start Exercise" text
    exercise_pattern = re.findall(r'Exercise\s+Start\s+Exercise', text)
    
    if exercise_pattern:
        # Try to find exercise titles - look for heading text before "Exercise Start Exercise"
        # In the HTML, look for sections with exercise markers
        all_headings = soup.find_all(["h2", "h3", "h4", "h5", "h6"])
        
        # Find elements containing "Exercise Start Exercise"
        exercise_elements = []
        for elem in soup.find_all(string=re.compile(r'Exercise', re.IGNORECASE)):
            parent = elem.parent
            while parent:
                if parent.name in ["section", "div", "article"]:
                    exercise_elements.append(parent)
                    break
                parent = parent.parent
        
        # Look for heading immediately before "Start Exercise" text
        for h in all_headings:
            h_text = h.get_text(strip=True)
            # Check if the next sibling or nearby element has "Exercise Start Exercise"
            next_elem = h.find_next_sibling()
            while next_elem:
                next_text = next_elem.get_text(strip=True) if hasattr(next_elem, 'get_text') else str(next_elem)
                if 'Start Exercise' in next_text:
                    exercises.append(h_text)
                    break
                if next_elem.name in ["h2", "h3", "h4", "h5", "h6"]:
                    break
                next_elem = next_elem.find_next_sibling()
        
        # If we didn't find heading-based titles, try regex on full text
        if not exercises:
            # Pattern: look for ## heading\n...\nExercise Start Exercise
            sections = re.split(r'\n(?=#{1,6}\s)', text)
            for section in sections:
                if 'Start Exercise' in section:
                    heading_match = re.match(r'#+\s*(.+)', section)
                    if heading_match:
                        exercises.append(heading_match.group(1).strip())
        
        # If still nothing, use a simple pattern on the raw text
        if not exercises:
            # Find text sections between headings
            parts = re.split(r'\n\s*\n', text)
            for i, part in enumerate(parts):
                if 'Start Exercise' in part:
                    # Look backwards for a heading-like text
                    for j in range(i-1, max(i-5, -1), -1):
                        candidate = parts[j].strip()
                        if candidate and len(candidate) < 200 and not candidate.startswith('Exercise'):
                            exercises.append(candidate)
                            break
        
        has_exercise = True
        if not exercises:
            exercises = [f"Exercise in: {lesson_title}"]
    else:
        has_exercise = False
    
    return (lesson_title, has_exercise, exercises)


def crawl_course(course_url, course_name, module):
    """Crawl a complete course and return structured data."""
    print(f"\n{'='*80}")
    print(f"CRAWLING: {course_name}")
    print(f"URL: {course_url}")
    print(f"MODULE: {module}")
    print(f"{'='*80}")
    
    course_slug = course_url.rstrip("/").split("/")[-1]
    
    # Step 1: Fetch course page and extract lesson URLs
    print("  Fetching course page...")
    html = fetch_page(course_url)
    if not html:
        print("  [ERROR] Failed to fetch course page!")
        return None
    
    # Try to get all lesson URLs from __NEXT_DATA__
    all_lesson_urls = find_all_lesson_urls_from_nextdata(html, course_slug)
    
    # Also try HTML parsing
    units_data, html_lessons = get_lesson_urls_from_course_page(course_url)
    
    # Merge URLs
    all_urls = set(all_lesson_urls)
    for l in html_lessons:
        all_urls.add(l["url"])
    
    all_urls = sorted(all_urls)
    print(f"  Found {len(all_urls)} lesson URLs")
    
    if not all_urls:
        print("  [WARN] No lesson URLs found!")
        return {"course": course_name, "url": course_url, "module": module, "lessons": []}
    
    # Step 2: Fetch each lesson page and check for exercises
    lessons_data = []
    for i, lesson_url in enumerate(all_urls):
        print(f"  [{i+1}/{len(all_urls)}] Fetching: {lesson_url.split('/')[-1][:60]}...")
        
        lesson_html = fetch_page(lesson_url)
        if not lesson_html:
            print(f"    [SKIP] Failed to fetch")
            continue
        
        title, has_exercise, exercise_titles = check_lesson_for_exercises(lesson_url, lesson_html)
        
        lesson_info = {
            "title": title,
            "url": lesson_url,
            "has_exercise": has_exercise,
            "exercise_titles": exercise_titles,
        }
        lessons_data.append(lesson_info)
        
        if has_exercise:
            print(f"    *** EXERCISE FOUND: {exercise_titles}")
        
        time.sleep(0.3)  # Be polite
    
    return {
        "course": course_name,
        "url": course_url,
        "module": module,
        "lessons": lessons_data,
    }


def main():
    all_results = []
    
    for module, courses in COURSES.items():
        for course in courses:
            result = crawl_course(course["url"], course["name"], module)
            if result:
                all_results.append(result)
    
    # Output structured results
    print("\n\n" + "="*100)
    print("FINAL STRUCTURED RESULTS")
    print("="*100)
    
    for result in all_results:
        print(f"\nCOURSE: {result['course']}")
        print(f"COURSE_URL: {result['url']}")
        print(f"MODULE: {result['module']}")
        print(f"LESSONS ({len(result['lessons'])}):")
        
        exercise_count = 0
        for lesson in result["lessons"]:
            ex_flag = "YES" if lesson["has_exercise"] else "no"
            print(f"  - LESSON: {lesson['title']}")
            print(f"    LESSON_URL: {lesson['url']}")
            print(f"    HAS_EXERCISE: {ex_flag}")
            if lesson["has_exercise"]:
                exercise_count += 1
                print(f"    EXERCISE_TITLES: {lesson['exercise_titles']}")
        
        print(f"  TOTAL EXERCISES: {exercise_count}")
    
    # Save to JSON
    with open("sap_courses_data.json", "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    print(f"\n\nResults saved to sap_courses_data.json")


if __name__ == "__main__":
    main()
