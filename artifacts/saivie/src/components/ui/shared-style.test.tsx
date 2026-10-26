import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "./button";
import { Card } from "./card";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Badge } from "./badge";
import { Tabs, TabsList, TabsTrigger } from "./tabs";

test("shared surfaces retain caller styling overrides", () => {
  const card = renderToStaticMarkup(<Card className="rounded-lg shadow-none">Vitals</Card>);
  assert.match(card, /rounded-lg/);
  assert.match(card, /shadow-none/);
  assert.doesNotMatch(card, /rounded-3xl|shadow-\[/);
  const button = renderToStaticMarkup(<Button size="sm" className="rounded-md">Save</Button>);
  assert.match(button, /rounded-md/);
  assert.doesNotMatch(button, /rounded-full/);
});

test("pill actions retain disabled state and semantic variants", () => {
  const html = renderToStaticMarkup(<><Button disabled>Save</Button><Button variant="destructive">Delete</Button><Badge variant="destructive">Alert</Badge></>);
  assert.match(html, /disabled=""/);
  assert.match(html, /rounded-full/);
  assert.match(html, /bg-destructive text-destructive-foreground/);
  assert.match(html, /focus-visible:ring-2/);
});

test("form controls retain labels, values and compact dimensions", () => {
  const html = renderToStaticMarkup(<><Input aria-label="Weight" type="number" defaultValue="60" disabled /><Textarea aria-label="Notes" defaultValue="Follow up" /></>);
  assert.match(html, /aria-label="Weight"/);
  assert.match(html, /type="number"/);
  assert.match(html, /value="60"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /h-9/);
  assert.match(html, /Follow up/);
  assert.match(html, /rounded-xl/);
});

test("pill tabs retain selection and accessible tab semantics", () => {
  const html = renderToStaticMarkup(<Tabs defaultValue="summary"><TabsList><TabsTrigger value="summary">Summary</TabsTrigger><TabsTrigger value="record">Record</TabsTrigger></TabsList></Tabs>);
  assert.match(html, /role="tablist"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /aria-selected="false"/);
  assert.match(html, /overflow-x-auto/);
});
